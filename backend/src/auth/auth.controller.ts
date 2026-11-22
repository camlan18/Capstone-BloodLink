import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, OtpDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../common/decorators';
import type { Request } from 'express';

/**
 * Controller xử lý các API xác thực: đăng ký, đăng nhập, OTP, token và khôi phục mật khẩu.
 */
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng ký tài khoản mới và gửi mã OTP xác thực qua email.
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  /**
   * Xác thực mã OTP để kích hoạt tài khoản người dùng.
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpDto) {
    return await this.authService.verifyOtp(dto);
  }

  /**
   * Gửi lại mã OTP xác thực tới email người dùng.
   */
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return await this.authService.resendOtp(dto);
  }

  /**
   * Đăng nhập hệ thống, ghi nhận IP/thiết bị và trả về cặp JWT token.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    // Ưu tiên lấy IP gốc từ header X-Forwarded-For (nếu đứng sau proxy) và user-agent thiết bị
    const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const device_info = req.headers['user-agent'] as string;
    return await this.authService.login(dto, { ip_address, device_info });
  }

  /**
   * Cấp mới access token từ refresh token hợp lệ.
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refresh_token);
  }

  /**
   * Đăng xuất và thu hồi refresh token của phiên hiện tại.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: Partial<RefreshTokenDto>) {
    return await this.authService.logout(dto?.refresh_token);
  }

  /**
   * Gửi mã OTP đặt lại mật khẩu tới email đã đăng ký.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  /**
   * Xác thực OTP và cập nhật mật khẩu mới cho tài khoản.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
