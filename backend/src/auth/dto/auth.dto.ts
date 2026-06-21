import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email hoặc tên đăng nhập' })
  @IsString()
  @IsNotEmpty({ message: 'Email hoặc Tên đăng nhập không được để trống' })
  identifier: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'Email đăng ký' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'newuser', description: 'Tên đăng nhập (tùy chọn)', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu đăng ký' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên người dùng' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(150)
  full_name: string;
}

export class OtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email để nhận OTP' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP gồm 6 số' })
  @IsString()
  @IsNotEmpty({ message: 'OTP không được để trống' })
  @MinLength(6, { message: 'OTP phải có 6 ký tự' })
  @MaxLength(6)
  otp_code: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email khôi phục mật khẩu' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email của tài khoản' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP đã nhận' })
  @IsString()
  @IsNotEmpty({ message: 'OTP không được để trống' })
  @MinLength(6, { message: 'OTP phải có 6 ký tự' })
  @MaxLength(6)
  otp_code: string;

  @ApiProperty({ example: 'newpassword123', description: 'Mật khẩu mới' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  new_password: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email để nhận lại OTP' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eb14d3153fabd5c926eb...', description: 'Mã Refresh Token' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token không được để trống' })
  refresh_token: string;
}
