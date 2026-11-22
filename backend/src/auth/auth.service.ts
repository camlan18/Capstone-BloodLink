import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto, OtpDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto } from './dto/auth.dto';
import { RoleCode, OtpTypeCode, DestinationType } from '../common/enums';
import { MailService } from '../mail/mail.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

/**
 * Service xử lý xác thực tài khoản: đăng ký, OTP email, đăng nhập, cấp mới/thu hồi token và đặt lại mật khẩu.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Đăng ký tài khoản người dùng mới, băm mật khẩu và gửi mã OTP xác thực qua email.
   */
  async register(dto: RegisterDto) {
    // B1: Kiểm tra email chưa tồn tại và lấy role mặc định USER
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const memberRole = await this.prisma.roles.findUnique({
      where: { role_code: RoleCode.USER },
    });

    if (!memberRole) {
      throw new BadRequestException('Hệ thống chưa cấu hình Role MEMBER');
    }

    // B2: Băm mật khẩu và sinh mã OTP 6 chữ số (lưu bản hash vào DB để đối chiếu)
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // B3: Lưu tài khoản ở trạng thái chưa xác thực email và bản ghi OTP cùng trong transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tạo user
      const user = await tx.users.create({
        data: {
          email: dto.email,
          username: dto.username || null,
          password_hash: hash,
          full_name: dto.full_name,
          role_id: memberRole.role_id,
          is_email_verified: false,
        },
      });

      // Đảm bảo loại OTP REGISTER_VERIFY tồn tại trong bảng cấu hình
      let otpType = await tx.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY } });
      if (!otpType) {
        otpType = await tx.otp_types.create({
          data: { otp_type_code: OtpTypeCode.REGISTER_VERIFY, otp_type_name: 'Xác thực đăng ký' }
        });
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (otpType.expiry_minutes || 10));

      await tx.user_otps.create({
        data: {
          user_id: user.user_id,
          otp_type_id: otpType.otp_type_id,
          destination: dto.email,
          destination_type: DestinationType.EMAIL,
          otp_hash: otpHash,
          expires_at: expiresAt,
          max_attempts: otpType.max_attempts || 5,
        },
      });

      return {
        user_id: user.user_id,
        email: user.email,
      };
    });

    // B4: Gửi email chứa mã OTP gốc cho người dùng vừa đăng ký
    await this.mailService.sendVerificationEmail(dto.email, otpCode, dto.full_name);

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
      user_id: result.user_id,
      email: result.email,
    };
  }

  /**
   * Xác thực mã OTP đăng ký và kích hoạt tài khoản người dùng.
   */
  async verifyOtp(dto: OtpDto) {
    // B1: Tìm tài khoản và lấy bản ghi OTP đăng ký mới nhất chưa xác thực
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY } });

    const latestOtp = await this.prisma.user_otps.findFirst({
      where: {
        user_id: user.user_id,
        otp_type_id: otpType?.otp_type_id,
        is_verified: false,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!latestOtp) {
      throw new BadRequestException('Không tìm thấy mã OTP nào đang chờ xác thực');
    }

    // B2: Kiểm tra hạn sử dụng và số lần thử sai tối đa trước khi so khớp bcrypt
    if (new Date() > latestOtp.expires_at) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    if (latestOtp.attempt_count >= latestOtp.max_attempts) {
      throw new BadRequestException('Bạn đã nhập sai OTP quá nhiều lần');
    }

    const isValid = await bcrypt.compare(dto.otp_code, latestOtp.otp_hash);

    // Nếu nhập sai thì tăng bộ đếm attempt_count để khóa khi vượt ngưỡng
    if (!isValid) {
      await this.prisma.user_otps.update({
        where: { otp_id: latestOtp.otp_id },
        data: { attempt_count: { increment: 1 } },
      });
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

    // B3: Xóa OTP đã dùng và kích hoạt trạng thái email verified + active cho tài khoản
    // OTP đúng, cập nhật trạng thái user
    await this.prisma.$transaction([
      this.prisma.user_otps.delete({
        where: { otp_id: latestOtp.otp_id },
      }),
      this.prisma.users.update({
        where: { user_id: user.user_id },
        data: { is_email_verified: true, is_active: true },
      }),
    ]);

    // B4: Thông báo tới Admin về thành viên mới và gửi lời chào mừng tới người dùng
    // Gửi thông báo cho Admin
    await this.notificationsService.notifyAdmins(
      'Người dùng mới',
      `Tài khoản ${user.email} vừa đăng ký thành công.`,
      NotificationType.INFO,
      'USER',
      user.user_id
    );

    // Gửi thông báo chào mừng cho người dùng
    await this.notificationsService.createNotification({
      user_ids: [user.user_id],
      title: 'Chào mừng bạn đến với BloodLink',
      message: 'Cảm ơn bạn đã đăng ký tài khoản. Hãy cập nhật hồ sơ hiến máu để chúng tôi hiểu rõ hơn về bạn nhé.',
      notification_type: NotificationType.INFO,
    });

    return { message: 'Xác thực tài khoản thành công. Bạn có thể đăng nhập.' };
  }

  /**
   * Tạo và gửi lại mã OTP mới qua email cho tài khoản chưa kích hoạt.
   */
  async resendOtp(dto: ResendOtpDto) {
    // B1: Kiểm tra tài khoản tồn tại và vẫn đang ở trạng thái chưa xác thực email
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('User không tồn tại');
    if (user.is_email_verified) throw new BadRequestException('Tài khoản đã được xác thực');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY } });

    // B2: Vô hiệu/xóa toàn bộ OTP đăng ký cũ chưa xác thực trước khi sinh mã mới
    // Delete old OTPs
    await this.prisma.user_otps.deleteMany({
      where: { user_id: user.user_id, otp_type_id: otpType?.otp_type_id, is_verified: false },
    });

    // B3: Sinh OTP mới 6 số, lưu bản hash với thời hạn mới và gửi lại email
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (otpType?.expiry_minutes || 10));

    await this.prisma.user_otps.create({
      data: {
        user_id: user.user_id,
        otp_type_id: otpType!.otp_type_id,
        destination: dto.email,
        destination_type: DestinationType.EMAIL,
        otp_hash: otpHash,
        expires_at: expiresAt,
        max_attempts: otpType?.max_attempts || 5,
      },
    });

    await this.mailService.sendVerificationEmail(dto.email, otpCode, user.full_name);
    return { message: 'Đã gửi lại mã OTP vào email của bạn.' };
  }

  /**
   * Xác thực thông tin đăng nhập, kiểm tra trạng thái kích hoạt và cấp phát access token + refresh token.
   */
  async login(dto: LoginDto, metadata?: { ip_address?: string; device_info?: string }) {
    // B1: Tìm tài khoản bằng email hoặc username kèm thông tin role và cơ sở y tế
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      },
      include: { role: true, facility: true },
    });

    // B2: Kiểm tra tồn tại, xác thực email, trạng thái kích hoạt và đối chiếu mật khẩu bcrypt
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.is_email_verified) {
      throw new UnauthorizedException('Tài khoản chưa xác thực email');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // B3: Tạo refresh token ngẫu nhiên, lưu bản băm SHA256 vào bảng phiên đăng nhập và cập nhật last_login_at
    // Sinh refresh token ngẫu nhiên và hash bằng SHA256 để lưu vào user_sessions
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Session có hiệu lực 30 ngày

    await this.prisma.user_sessions.create({
      data: {
        user_id: user.user_id,
        refresh_token_hash: tokenHash,
        device_info: metadata?.device_info || null,
        ip_address: metadata?.ip_address || null,
        expires_at: expiresAt,
      },
    });

    await this.prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        last_login_at: new Date(),
      },
    });

    // B4: Ký JWT access_token và trả kèm thông tin cơ bản của người dùng
    const payload = { sub: user.user_id, email: user.email, role: user.role.role_code, facility_id: user.facility_id };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: rawRefreshToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: {
          role_code: user.role.role_code,
          role_name: user.role.role_name
        },
        facility_id: user.facility_id,
        facility: user.facility ? { facility_name: user.facility.facility_name } : undefined,
      }
    };
  }

  /**
   * Kiểm tra refresh token còn hiệu lực trong DB và xoay vòng cấp cặp token mới.
   */
  async refreshToken(rawRefreshToken: string) {
    // B1: Băm refresh token đầu vào bằng SHA256 và tìm phiên còn hiệu lực, chưa bị thu hồi
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const session = await this.prisma.user_sessions.findFirst({
      where: {
        refresh_token_hash: tokenHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: {
        user: {
          include: { role: true, facility: true }
        }
      }
    });

    if (!session || !session.user || !session.user.is_active) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // B2: Xoay vòng refresh token mới đè lên session cũ để chống dùng lại token cũ
    // Xoay vòng Refresh Token (Token Rotation)
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    await this.prisma.user_sessions.update({
      where: { session_id: session.session_id },
      data: {
        refresh_token_hash: newTokenHash,
        expires_at: newExpiresAt,
        last_used_at: new Date(),
      },
    });

    const user = session.user;
    const payload = { sub: user.user_id, email: user.email, role: user.role.role_code, facility_id: user.facility_id };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role.role_code,
        facility_id: user.facility_id,
        facility: user.facility ? { facility_name: user.facility.facility_name } : undefined,
      }
    };
  }

  /**
   * Đăng xuất bằng cách thu hồi bản ghi refresh token tương ứng.
   */
  async logout(rawRefreshToken?: string) {
    // Nếu có refresh_token, băm SHA256 và đánh dấu revoked_at cho phiên đăng nhập tương ứng
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await this.prisma.user_sessions.updateMany({
        where: { refresh_token_hash: tokenHash, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }
    return { message: 'Đăng xuất thành công' };
  }

  /**
   * Tạo và gửi mã OTP khôi phục mật khẩu tới email tài khoản đã đăng ký.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    // B1: Xác nhận email tồn tại trong hệ thống và sinh OTP 6 chữ số kèm bản hash
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // B2: Đóng toàn bộ OTP khôi phục cũ chưa dùng rồi lưu OTP mới vào DB trong transaction
    await this.prisma.$transaction(async (tx) => {
      let otpType = await tx.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.RESET_PASSWORD } });
      if (!otpType) {
        otpType = await tx.otp_types.create({
          data: { otp_type_code: OtpTypeCode.RESET_PASSWORD, otp_type_name: 'Khôi phục mật khẩu' }
        });
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (otpType.expiry_minutes || 10));

      await tx.user_otps.updateMany({
        where: { user_id: user.user_id, otp_type_id: otpType.otp_type_id, is_verified: false },
        data: { is_verified: true }
      });

      await tx.user_otps.create({
        data: {
          user_id: user.user_id,
          otp_type_id: otpType.otp_type_id,
          destination: dto.email,
          destination_type: DestinationType.EMAIL,
          otp_hash: otpHash,
          expires_at: expiresAt,
          max_attempts: otpType.max_attempts || 5,
        },
      });
    });

    await this.mailService.sendForgotPasswordEmail(dto.email, otpCode);

    return { message: 'Đã gửi mã OTP khôi phục mật khẩu vào email của bạn.' };
  }

  /**
   * Xác thực OTP khôi phục và cập nhật mật khẩu mới cho tài khoản.
   */
  async resetPassword(dto: ResetPasswordDto) {
    // B1: Tìm tài khoản và lấy mã OTP RESET_PASSWORD gần nhất chưa được xác thực
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.RESET_PASSWORD } });

    const latestOtp = await this.prisma.user_otps.findFirst({
      where: {
        user_id: user.user_id,
        otp_type_id: otpType?.otp_type_id,
        is_verified: false,
      },
      orderBy: { created_at: 'desc' },
    });

    // B2: Kiểm tra hạn OTP, số lần nhập sai tối đa và đối chiếu mã OTP bằng bcrypt
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

    // B3: Băm mật khẩu mới, đánh dấu OTP đã dùng, đổi mật khẩu và thu hồi toàn bộ phiên đăng nhập cũ
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(dto.new_password, salt);

    await this.prisma.$transaction([
      this.prisma.user_otps.update({
        where: { otp_id: latestOtp.otp_id },
        data: { is_verified: true, verified_at: new Date() },
      }),
      this.prisma.users.update({
        where: { user_id: user.user_id },
        data: { password_hash: newPasswordHash },
      }),
      // Thu hồi toàn bộ session khi đổi mật khẩu để bảo vệ tài khoản
      this.prisma.user_sessions.updateMany({
        where: { user_id: user.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    await this.notificationsService.createNotification({
      user_ids: [user.user_id],
      title: 'Đổi mật khẩu thành công',
      message: 'Mật khẩu của bạn đã được thay đổi thành công thông qua tính năng khôi phục mật khẩu.',
      notification_type: NotificationType.SUCCESS,
    });

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }
}
