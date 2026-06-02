import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordVerifyDto {
  @ApiProperty({ example: '123456', description: 'Mã OTP' })
  @IsString()
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  otp_code: string;

  @ApiProperty({ example: 'newpassword123', description: 'Mật khẩu mới' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  new_password: string;
}

export class CreateUserAdminDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email của tài khoản quản trị' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Quản Trị', description: 'Họ tên quản trị viên' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(150)
  full_name: string;

  @ApiProperty({ example: 1, description: 'ID của quyền (Role)' })
  @IsInt()
  @IsNotEmpty({ message: 'Quyền (role_id) không được để trống' })
  @Type(() => Number)
  role_id: number;
}

export class UpdateUserAdminDto {
  @ApiProperty({ example: 2, description: 'ID của quyền (Role)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  role_id?: number;

  @ApiProperty({ example: true, description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
