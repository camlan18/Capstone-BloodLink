import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, OtpDto, ForgotPasswordDto, ResetPasswordDto, ResendOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from '../common/decorators';
import type { Request } from 'express';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpDto) {
    return await this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return await this.authService.resendOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const device_info = req.headers['user-agent'] as string;
    return await this.authService.login(dto, { ip_address, device_info });
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: Partial<RefreshTokenDto>) {
    return await this.authService.logout(dto?.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
