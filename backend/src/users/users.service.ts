import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordVerifyDto, CreateUserAdminDto, UpdateUserAdminDto } from './dto/users.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MailService } from '../mail/mail.service';
import { OtpTypeCode, DestinationType } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly mailService: MailService
  ) {}

  async getProfile(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        role: true,
        blood_type: true,
        province: true,
        district: true,
        ward: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    delete (user as any).password_hash;
    return user;
  }

  async updateProfile(userId: number, data: any) {
    // Only allow updating safe fields
    const safeData = {
      full_name: data.full_name,
      phone: data.phone,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
      gender: data.gender,
      avatar_url: data.avatar_url,
      address: data.address,
      province_id: data.province_id,
      district_id: data.district_id,
      ward_id: data.ward_id,
      blood_type_id: data.blood_type_id,
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

    return { message: 'Đổi mật khẩu thành công' };
  }

  async createUserAdmin(dto: CreateUserAdminDto) {
    const existingUser = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('Email đã tồn tại');

    // Default password for admin created user: 'Blood@123456'
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Blood@123456', salt);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password_hash: hash,
        full_name: dto.full_name,
        role_id: dto.role_id,
        is_email_verified: true,
        is_active: true,
      }
    });

    delete (user as any).password_hash;
    return user;
  }

  async getUserById(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User không tồn tại');
    delete (user as any).password_hash;
    return user;
  }

  async updateUserAdmin(userId: number, dto: UpdateUserAdminDto) {
    const user = await this.prisma.users.update({
      where: { user_id: userId },
      data: {
        ...(dto.role_id ? { role_id: dto.role_id } : {}),
        ...(dto.is_active !== undefined ? { is_active: dto.is_active } : {}),
      }
    });
    delete (user as any).password_hash;
    return user;
  }

  async toggleLockUser(userId: number) {
    const user = await this.prisma.users.findUnique({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('User không tồn tại');

    if (user.role_id === 1) throw new BadRequestException('Không thể khóa Super Admin'); // Assuming 1 is Admin

    const updated = await this.prisma.users.update({
      where: { user_id: userId },
      data: { is_active: !user.is_active },
    });
    
    return { message: updated.is_active ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' };
  }
}
