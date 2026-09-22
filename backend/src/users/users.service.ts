import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordVerifyDto, CreateUserAdminDto, UpdateUserAdminDto } from './dto/users.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { OtpTypeCode, DestinationType } from '../common/enums';
import { ExcelUtil } from '../common/utils/excel.util';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        role: true,
        blood_type: true,
        province: true,
        ward: true,
        facility: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    delete (user as any).password_hash;
    return user;
  }

  async updateProfile(userId: number, data: any) {
    this.validateUserPayload(data, true);

    // Only allow updating safe fields
    const safeData = {
      full_name: data.full_name?.trim(),
      phone: data.phone?.trim() || null,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      gender: data.gender,
      avatar_url: data.avatar_url,
      address: data.address,
      province_id: data.province_id !== undefined ? (data.province_id && data.province_id > 0 ? data.province_id : null) : undefined,
      ward_id: data.ward_id !== undefined ? (data.ward_id && data.ward_id > 0 ? data.ward_id : null) : undefined,
      blood_type_id: data.blood_type_id !== undefined ? (data.blood_type_id && data.blood_type_id > 0 ? data.blood_type_id : null) : undefined,
    };

    // Remove undefined
    Object.keys(safeData).forEach(key => (safeData as any)[key] === undefined && delete (safeData as any)[key]);

    const updated = await this.prisma.users.update({
      where: { user_id: userId },
      data: safeData,
    });
    delete (updated as any).password_hash;
    delete (updated as any).password_hash;
    return updated;
  }

  async uploadAvatar(userId: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const result = await this.cloudinary.uploadFile(file);
    const updated = await this.prisma.users.update({
      where: { user_id: userId },
      data: { avatar_url: result.secure_url },
    });
    delete (updated as any).password_hash;
    return updated;
  }

  // Admin APIs
  async getAllUsers(query: UserFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role_id) {
      where.role_id = query.role_id;
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { full_name: { contains: query.search } },
        { phone: { contains: query.search } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.created_at = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        include: { role: true },
        orderBy,
      }),
      this.prisma.users.count({ where }),
    ]);

    data.forEach((user: any) => delete user.password_hash);
    
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async sendChangePasswordOtp(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    await this.prisma.$transaction(async (tx) => {
      let otpType = await tx.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.CHANGE_PASSWORD }});
      if (!otpType) {
        otpType = await tx.otp_types.create({
          data: { otp_type_code: OtpTypeCode.CHANGE_PASSWORD, otp_type_name: 'Đổi mật khẩu' }
        });
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (otpType.expiry_minutes || 10));

      // Hủy các OTP change password cũ
      await tx.user_otps.updateMany({
        where: { user_id: user.user_id, otp_type_id: otpType.otp_type_id, is_verified: false },
        data: { is_verified: true } // đánh dấu là hết hiệu lực
      });

      await tx.user_otps.create({
        data: {
          user_id: user.user_id,
          otp_type_id: otpType.otp_type_id,
          destination: user.email,
          destination_type: DestinationType.EMAIL,
          otp_hash: otpHash,
          expires_at: expiresAt,
          max_attempts: otpType.max_attempts || 5,
        },
      });
    });

    await this.mailService.sendChangePasswordEmail(user.email, otpCode, user.full_name || 'Bạn');

    return { message: 'Đã gửi mã OTP đổi mật khẩu vào email của bạn.' };
  }

  async changePassword(userId: number, dto: ChangePasswordVerifyDto) {
    const user = await this.prisma.users.findUnique({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.CHANGE_PASSWORD }});

    const latestOtp = await this.prisma.user_otps.findFirst({
      where: {
        user_id: user.user_id,
        otp_type_id: otpType?.otp_type_id,
        is_verified: false,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!latestOtp) throw new BadRequestException('Không tìm thấy mã OTP nào đang chờ xác thực');
    if (new Date() > latestOtp.expires_at) throw new BadRequestException('Mã OTP đã hết hạn');
    if (latestOtp.attempt_count >= latestOtp.max_attempts) throw new BadRequestException('Bạn đã nhập sai OTP quá nhiều lần');

    const isValid = await bcrypt.compare(dto.otp_code, latestOtp.otp_hash);

    if (!isValid) {
      await this.prisma.user_otps.update({
        where: { otp_id: latestOtp.otp_id },
        data: { attempt_count: { increment: 1 } },
      });
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.new_password, salt);

    await this.prisma.$transaction([
      this.prisma.user_otps.update({
        where: { otp_id: latestOtp.otp_id },
        data: { is_verified: true, verified_at: new Date() },
      }),
      this.prisma.users.update({
        where: { user_id: userId },
        data: { password_hash: hash },
      }),
    ]);

    await this.notificationsService.createNotification({
      user_ids: [user.user_id],
      title: 'Đổi mật khẩu thành công',
      message: 'Mật khẩu của bạn đã được thay đổi thành công thông qua mục Hồ sơ cá nhân.',
      notification_type: NotificationType.SUCCESS,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  private validateUserPayload(dto: any, isUpdate = false) {
    // 1. Họ và tên
    if (dto.full_name !== undefined) {
      const name = dto.full_name?.trim();
      if (!name) {
        throw new BadRequestException('Họ và tên không được để trống');
      }
      if (name.length < 2) {
        throw new BadRequestException('Họ và tên phải có ít nhất 2 ký tự');
      }
      const nameRegex = /^[a-zA-ZÀ-ỹ\s'.-]+$/u;
      if (!nameRegex.test(name)) {
        throw new BadRequestException('Họ và tên không được chứa ký tự đặc biệt hoặc số');
      }
    }

    // 2. Email
    if (dto.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email.trim())) {
        throw new BadRequestException('Định dạng email không hợp lệ');
      }
    }

    // 3. Số điện thoại
    if (dto.phone) {
      const cleanPhone = dto.phone.replace(/[\s.-]/g, '');
      const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new BadRequestException('Số điện thoại không hợp lệ (Phải là SĐT Việt Nam gồm 10 chữ số, VD: 0901234567)');
      }
    }

    // 4. CCCD / CMND
    if (dto.identity_card) {
      const cleanCccd = dto.identity_card.trim();
      const cccdRegex = /^[0-9]{9}$|^[0-9]{12}$/;
      if (!cccdRegex.test(cleanCccd)) {
        throw new BadRequestException('CCCD/CMND không hợp lệ (Phải là dãy 9 hoặc 12 chữ số)');
      }
    }

    // 5. Ngày sinh & Độ tuổi hiến máu (Từ đủ 18 đến 65 tuổi theo Thông tư 26/2013/TT-BYT)
    if (dto.date_of_birth) {
      const dob = new Date(dto.date_of_birth);
      const now = new Date();
      if (isNaN(dob.getTime())) {
        throw new BadRequestException('Ngày sinh không đúng định dạng');
      }
      if (dob > now) {
        throw new BadRequestException('Ngày sinh không thể là ngày trong tương lai');
      }

      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 18) {
        throw new BadRequestException(`Người dùng chưa đủ 18 tuổi (${age} tuổi). Theo quy định y tế về hiến máu (Thông tư 26/2013/TT-BYT), người tham gia phải từ đủ 18 tuổi trở lên.`);
      }
      if (age > 65) {
        throw new BadRequestException(`Người dùng đã vượt quá độ tuổi cho phép (${age} tuổi). Độ tuổi tối đa theo quy định hiến máu là 60 - 65 tuổi.`);
      }
    }

    // 6. Mật khẩu
    if (!isUpdate && dto.password && dto.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // 7. Hồ sơ hiến máu (nếu có)
    if (dto.donor_profile) {
      const dp = dto.donor_profile;
      if (dp.weight_kg !== undefined && dp.weight_kg !== null && dp.weight_kg !== '') {
        const weight = Number(dp.weight_kg);
        if (isNaN(weight) || weight < 42 || weight > 200) {
          throw new BadRequestException('Cân nặng không hợp lệ (Theo tiêu chuẩn hiến máu, cân nặng tối thiểu từ 42kg với nữ và 45kg với nam)');
        }
      }
      if (dp.height_cm !== undefined && dp.height_cm !== null && dp.height_cm !== '') {
        const height = Number(dp.height_cm);
        if (isNaN(height) || height < 100 || height > 250) {
          throw new BadRequestException('Chiều cao không hợp lệ (Trong khoảng 100cm - 250cm)');
        }
      }
      if (dp.emergency_contact_phone) {
        const cleanEPhone = dp.emergency_contact_phone.replace(/[\s.-]/g, '');
        const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phoneRegex.test(cleanEPhone)) {
          throw new BadRequestException('Số điện thoại liên hệ khẩn cấp không hợp lệ');
        }
      }
      if (dp.first_donation_date && dto.date_of_birth) {
        const firstDate = new Date(dp.first_donation_date);
        const dob = new Date(dto.date_of_birth);
        if (firstDate < dob) {
          throw new BadRequestException('Ngày hiến máu đầu tiên không thể trước ngày sinh');
        }
      }
      if (dp.last_donation_date && dp.first_donation_date) {
        const lastDate = new Date(dp.last_donation_date);
        const firstDate = new Date(dp.first_donation_date);
        if (lastDate < firstDate) {
          throw new BadRequestException('Lần hiến gần nhất không thể trước lần hiến đầu tiên');
        }
      }
    }
  }

  async createUserAdmin(dto: CreateUserAdminDto) {
    this.validateUserPayload(dto, false);

    const existingUser = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email đã tồn tại');

    if (dto.identity_card) {
      const existingCccd = await this.prisma.users.findFirst({ where: { identity_card: dto.identity_card.trim() } });
      if (existingCccd) throw new BadRequestException('CCCD/CMND này đã được đăng ký cho một tài khoản khác');
    }

    const rawPassword = dto.password || 'Blood@123456';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    const data: any = {
      email: dto.email.trim(),
      password_hash: hash,
      full_name: dto.full_name.trim(),
      role_id: dto.role_id,
      is_email_verified: dto.is_email_verified !== undefined ? dto.is_email_verified : true,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
    };
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.date_of_birth !== undefined) data.date_of_birth = dto.date_of_birth ? new Date(dto.date_of_birth) : null;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.identity_card !== undefined) data.identity_card = dto.identity_card?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.province_id !== undefined) data.province_id = dto.province_id && dto.province_id > 0 ? dto.province_id : null;
    if (dto.ward_id !== undefined) data.ward_id = dto.ward_id && dto.ward_id > 0 ? dto.ward_id : null;
    if (dto.blood_type_id !== undefined) data.blood_type_id = dto.blood_type_id && dto.blood_type_id > 0 ? dto.blood_type_id : null;
    if (dto.is_donor_registered !== undefined) data.is_donor_registered = dto.is_donor_registered;
    if (dto.is_available_for_donation !== undefined) data.is_available_for_donation = dto.is_available_for_donation;
    if (dto.facility_id !== undefined) data.facility_id = dto.facility_id && dto.facility_id > 0 ? dto.facility_id : null;

    const role = await this.prisma.roles.findUnique({ where: { role_id: dto.role_id } });
    if (role?.role_code === 'HOSPITAL_STAFF' && (!data.facility_id || data.facility_id <= 0)) {
      throw new BadRequestException('Vai trò Nhân viên bệnh viện bắt buộc phải chọn Cơ sở y tế trực thuộc');
    }

    if (dto.donor_profile) {
      data.donor_profile = {
        create: {
          blood_type_id: dto.donor_profile.blood_type_id || dto.blood_type_id || 1,
          weight_kg: dto.donor_profile.weight_kg,
          height_cm: dto.donor_profile.height_cm,
          first_donation_date: dto.donor_profile.first_donation_date ? new Date(dto.donor_profile.first_donation_date) : null,
          total_donations: dto.donor_profile.total_donations || 0,
          last_donation_date: dto.donor_profile.last_donation_date ? new Date(dto.donor_profile.last_donation_date) : null,
          next_eligible_date: dto.donor_profile.next_eligible_date ? new Date(dto.donor_profile.next_eligible_date) : null,
          health_notes: dto.donor_profile.health_notes,
          emergency_contact_name: dto.donor_profile.emergency_contact_name,
          emergency_contact_phone: dto.donor_profile.emergency_contact_phone,
          is_active: dto.donor_profile.is_active !== undefined ? dto.donor_profile.is_active : true,
        }
      };
    }

    const user = await this.prisma.users.create({
      data
    });

    delete (user as any).password_hash;
    return user;
  }

  async getUserById(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: { 
        role: true,
        province: true,
        ward: true,
        blood_type: true,
        donor_profile: {
          include: { blood_type: true }
        },
        donations_donor: {
          include: { facility: true, component: true },
          orderBy: { created_at: 'desc' }
        }
      },
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    delete (user as any).password_hash;
    return user;
  }

  async updateUserAdmin(userId: number, dto: UpdateUserAdminDto) {
    this.validateUserPayload(dto, true);

    if (dto.email) {
      const existingEmail = await this.prisma.users.findFirst({
        where: { email: dto.email.trim(), user_id: { not: userId } }
      });
      if (existingEmail) throw new BadRequestException('Email đã tồn tại trên hệ thống');
    }

    if (dto.identity_card) {
      const existingCccd = await this.prisma.users.findFirst({
        where: { identity_card: dto.identity_card.trim(), user_id: { not: userId } }
      });
      if (existingCccd) throw new BadRequestException('CCCD/CMND này đã được đăng ký cho một tài khoản khác');
    }

    const data: any = {};
    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      data.password_hash = await bcrypt.hash(dto.password, salt);
    }
    if (dto.role_id !== undefined) data.role_id = dto.role_id;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.full_name !== undefined) data.full_name = dto.full_name?.trim();
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) data.email = dto.email?.trim();
    if (dto.date_of_birth !== undefined) data.date_of_birth = dto.date_of_birth ? new Date(dto.date_of_birth) : null;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.identity_card !== undefined) data.identity_card = dto.identity_card?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.province_id !== undefined) data.province_id = dto.province_id && dto.province_id > 0 ? dto.province_id : null;
    if (dto.ward_id !== undefined) data.ward_id = dto.ward_id && dto.ward_id > 0 ? dto.ward_id : null;
    if (dto.blood_type_id !== undefined) data.blood_type_id = dto.blood_type_id && dto.blood_type_id > 0 ? dto.blood_type_id : null;
    if (dto.is_donor_registered !== undefined) data.is_donor_registered = dto.is_donor_registered;
    if (dto.is_available_for_donation !== undefined) data.is_available_for_donation = dto.is_available_for_donation;
    if (dto.is_email_verified !== undefined) data.is_email_verified = dto.is_email_verified;
    if (dto.facility_id !== undefined) data.facility_id = dto.facility_id && dto.facility_id > 0 ? dto.facility_id : null;

    const targetRoleId = dto.role_id || (await this.prisma.users.findUnique({ where: { user_id: userId } }))?.role_id;
    if (targetRoleId) {
      const role = await this.prisma.roles.findUnique({ where: { role_id: targetRoleId } });
      if (role?.role_code === 'HOSPITAL_STAFF' && dto.facility_id !== undefined && (!data.facility_id || data.facility_id <= 0)) {
        throw new BadRequestException('Vai trò Nhân viên bệnh viện bắt buộc phải chọn Cơ sở y tế trực thuộc');
      }
    }

    if (dto.donor_profile) {
      data.donor_profile = {
        upsert: {
          create: {
            blood_type_id: dto.donor_profile.blood_type_id || dto.blood_type_id || 1,
            weight_kg: dto.donor_profile.weight_kg,
            height_cm: dto.donor_profile.height_cm,
            first_donation_date: dto.donor_profile.first_donation_date ? new Date(dto.donor_profile.first_donation_date) : null,
            total_donations: dto.donor_profile.total_donations || 0,
            last_donation_date: dto.donor_profile.last_donation_date ? new Date(dto.donor_profile.last_donation_date) : null,
            next_eligible_date: dto.donor_profile.next_eligible_date ? new Date(dto.donor_profile.next_eligible_date) : null,
            health_notes: dto.donor_profile.health_notes,
            emergency_contact_name: dto.donor_profile.emergency_contact_name,
            emergency_contact_phone: dto.donor_profile.emergency_contact_phone,
            is_active: dto.donor_profile.is_active !== undefined ? dto.donor_profile.is_active : true,
          },
          update: {
            ...(dto.donor_profile.blood_type_id !== undefined && { blood_type_id: dto.donor_profile.blood_type_id }),
            ...(dto.donor_profile.weight_kg !== undefined && { weight_kg: dto.donor_profile.weight_kg }),
            ...(dto.donor_profile.height_cm !== undefined && { height_cm: dto.donor_profile.height_cm }),
            ...(dto.donor_profile.first_donation_date !== undefined && { first_donation_date: dto.donor_profile.first_donation_date ? new Date(dto.donor_profile.first_donation_date) : null }),
            ...(dto.donor_profile.total_donations !== undefined && { total_donations: dto.donor_profile.total_donations }),
            ...(dto.donor_profile.last_donation_date !== undefined && { last_donation_date: dto.donor_profile.last_donation_date ? new Date(dto.donor_profile.last_donation_date) : null }),
            ...(dto.donor_profile.next_eligible_date !== undefined && { next_eligible_date: dto.donor_profile.next_eligible_date ? new Date(dto.donor_profile.next_eligible_date) : null }),
            ...(dto.donor_profile.health_notes !== undefined && { health_notes: dto.donor_profile.health_notes }),
            ...(dto.donor_profile.emergency_contact_name !== undefined && { emergency_contact_name: dto.donor_profile.emergency_contact_name }),
            ...(dto.donor_profile.emergency_contact_phone !== undefined && { emergency_contact_phone: dto.donor_profile.emergency_contact_phone }),
            ...(dto.donor_profile.is_active !== undefined && { is_active: dto.donor_profile.is_active }),
          }
        }
      };
    }

    const user = await this.prisma.users.update({
      where: { user_id: userId },
      data,
    });
    delete (user as any).password_hash;
    return user;
  }

  async toggleLockUser(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { user_id: userId }, include: { role: true } });
    if (!user) throw new NotFoundException('User không tồn tại');

    if (user.role?.role_code === 'ADMIN') throw new BadRequestException('Không thể khóa Super Admin');

    const updated = await this.prisma.users.update({
      where: { user_id: userId },
      data: { is_active: !user.is_active },
    });
    
    return { message: updated.is_active ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' };
  }

  // --- EXCEL FEATURE ---

  async exportExcel(query: any): Promise<Buffer> {
    const list = await this.getAllUsers({ ...query, limit: 10000 });
    const data = list.data.map((item: any) => ({
      'Email': item.email,
      'Họ tên': item.full_name || '',
      'Số điện thoại': item.phone || '',
      'CCCD': item.identity_card || '',
      'Ngày sinh': item.date_of_birth ? new Date(item.date_of_birth).toLocaleDateString('vi-VN') : '',
      'Giới tính': item.gender === 'M' ? 'Nam' : item.gender === 'F' ? 'Nữ' : 'Khác',
      'Vai trò': item.role?.role_name || '',
      'Cơ sở (Nếu có)': item.facility?.facility_name || '',
      'Trạng thái': item.is_active ? 'Hoạt động' : 'Đã khóa'
    }));
    return ExcelUtil.generateExcel(data, 'NguoiDung');
  }

  async getTemplate(): Promise<Buffer> {
    const headers = [
      'Email',
      'Mật khẩu',
      'Họ tên',
      'Số điện thoại',
      'CCCD',
      'Role (ID)',
      'Facility (ID)',
      'Ngày sinh (YYYY-MM-DD)',
      'Giới tính (M/F)'
    ];
    return ExcelUtil.generateTemplate(headers, 'Template_NguoiDung');
  }

  async importExcel(buffer: Buffer, staffId: number) {
    const data = ExcelUtil.parseExcel(buffer);
    let success = 0;
    let failed = 0;

    for (const row of data) {
      try {
        const email = row['Email'];
        const password = row['Mật khẩu'] || '123456';
        const fullName = row['Họ tên'];
        const roleId = Number(row['Role (ID)']);

        if (!email || !fullName || !roleId) {
          failed++;
          continue;
        }

        const exist = await this.prisma.users.findUnique({ where: { email } });
        if (exist) {
          failed++;
          continue;
        }

        const hashedPassword = await bcrypt.hash(password.toString(), 10);
        
        const facilityId = row['Facility (ID)'] && Number(row['Facility (ID)']) > 0 ? Number(row['Facility (ID)']) : null;
        const dobStr = row['Ngày sinh (YYYY-MM-DD)'];
        const dob = dobStr ? new Date(dobStr) : null;
        const gender = row['Giới tính (M/F)'] === 'M' ? 'M' : row['Giới tính (M/F)'] === 'F' ? 'F' : 'O';

        await this.prisma.users.create({
          data: {
            email,
            password_hash: hashedPassword,
            full_name: fullName,
            role_id: roleId,
            phone: row['Số điện thoại']?.toString(),
            identity_card: row['CCCD']?.toString(),
            date_of_birth: dob,
            gender: gender,
            facility_id: facilityId,
            is_active: true
          }
        });
        success++;
      } catch (err) {
        failed++;
      }
    }

    return { message: `Import hoàn tất. Thành công: ${success}, Thất bại/Bỏ qua: ${failed}` };
  }
}
