import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto, OtpDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto } from './dto/auth.dto';
import { RoleCode, OtpTypeCode, DestinationType } from '../common/enums';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.users.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const memberRole = await this.prisma.roles.findUnique({
      where: { role_code: RoleCode.MEMBER },
    });

    if (!memberRole) {
      throw new BadRequestException('Hệ thống chưa cấu hình Role MEMBER');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(dto.password, salt);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

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
      
      let otpType = await tx.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY }});
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

    // Gửi email bên ngoài transaction để tránh timeout
    await this.mailService.sendVerificationEmail(dto.email, otpCode, dto.full_name);

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
      user_id: result.user_id,
      email: result.email,
    };
  }

  async verifyOtp(dto: OtpDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email }});
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY }});

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

    if (new Date() > latestOtp.expires_at) {
      throw new BadRequestException('Mã OTP đã hết hạn');
    }

    if (latestOtp.attempt_count >= latestOtp.max_attempts) {
      throw new BadRequestException('Bạn đã nhập sai OTP quá nhiều lần');
    }

    const isValid = await bcrypt.compare(dto.otp_code, latestOtp.otp_hash);

    if (!isValid) {
      await this.prisma.user_otps.update({
        where: { otp_id: latestOtp.otp_id },
        data: { attempt_count: { increment: 1 } },
      });
      throw new BadRequestException('Mã OTP không hợp lệ');
    }

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

    return { message: 'Xác thực tài khoản thành công. Bạn có thể đăng nhập.' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email }});
    if (!user) throw new BadRequestException('User không tồn tại');
    if (user.is_email_verified) throw new BadRequestException('Tài khoản đã được xác thực');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.REGISTER_VERIFY }});

    // Delete old OTPs
    await this.prisma.user_otps.deleteMany({
      where: { user_id: user.user_id, otp_type_id: otpType?.otp_type_id, is_verified: false },
    });

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

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findFirst({
      where: { 
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      },
      include: { role: true },
    });

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

    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Cập nhật last login và refresh_token
    await this.prisma.users.update({
      where: { user_id: user.user_id },
      data: { 
        last_login_at: new Date(),
        refresh_token: refreshToken
      },
    });

    const payload = { sub: user.user_id, email: user.email, role: user.role.role_code };
    
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role.role_code,
      }
    };
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const user = await this.prisma.users.findFirst({
      where: { refresh_token: refreshToken, is_active: true },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // Cấp phát access_token mới và refresh_token mới (xoay vòng)
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    await this.prisma.users.update({
      where: { user_id: user.user_id },
      data: { refresh_token: newRefreshToken },
    });

    const payload = { sub: user.user_id, email: user.email, role: user.role.role_code };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email }});
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    await this.prisma.$transaction(async (tx) => {
      let otpType = await tx.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.RESET_PASSWORD }});
      if (!otpType) {
        otpType = await tx.otp_types.create({
          data: { otp_type_code: OtpTypeCode.RESET_PASSWORD, otp_type_name: 'Khôi phục mật khẩu' }
        });
      }
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (otpType.expiry_minutes || 10));

      // Hủy các OTP reset password cũ
      await tx.user_otps.updateMany({
        where: { user_id: user.user_id, otp_type_id: otpType.otp_type_id, is_verified: false },
        data: { is_verified: true } // đánh dấu là hết hiệu lực
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

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email }});
    if (!user) throw new BadRequestException('User không tồn tại');

    const otpType = await this.prisma.otp_types.findUnique({ where: { otp_type_code: OtpTypeCode.RESET_PASSWORD }});

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
    ]);

    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }
}
