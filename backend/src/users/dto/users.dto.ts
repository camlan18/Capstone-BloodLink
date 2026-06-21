import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsInt, IsBoolean, ValidateNested } from 'class-validator';
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

export class DonorProfileInputDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  blood_type_id?: number;

  @IsOptional()
  @Type(() => Number)
  weight_kg?: number;

  @IsOptional()
  @Type(() => Number)
  height_cm?: number;

  @IsOptional()
  @Type(() => Date)
  first_donation_date?: Date;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  total_donations?: number;

  @IsOptional()
  @Type(() => Date)
  last_donation_date?: Date;

  @IsOptional()
  @Type(() => Date)
  next_eligible_date?: Date;

  @IsOptional()
  @IsString()
  health_notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergency_contact_phone?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateUserAdminDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Email của tài khoản quản trị' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  username?: string;

  @ApiProperty({ example: 'Nguyễn Quản Trị', description: 'Họ tên quản trị viên' })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(150)
  full_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Type(() => Date)
  date_of_birth?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  identity_card?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  province_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  district_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ward_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  blood_type_id?: number;

  @IsOptional()
  @IsBoolean()
  is_donor_registered?: boolean;

  @IsOptional()
  @IsBoolean()
  is_available_for_donation?: boolean;

  @IsOptional()
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiProperty({ example: 1, description: 'ID của quyền (Role)' })
  @IsInt()
  @IsNotEmpty({ message: 'Quyền (role_id) không được để trống' })
  @Type(() => Number)
  role_id: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DonorProfileInputDto)
  donor_profile?: DonorProfileInputDto;
}

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @Type(() => Date)
  date_of_birth?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  identity_card?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  province_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  district_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ward_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  blood_type_id?: number;

  @IsOptional()
  @IsBoolean()
  is_donor_registered?: boolean;

  @IsOptional()
  @IsBoolean()
  is_available_for_donation?: boolean;

  @IsOptional()
  @IsBoolean()
  is_email_verified?: boolean;

  @ApiProperty({ example: 2, description: 'ID của quyền (Role)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  role_id?: number;

  @ApiProperty({ example: true, description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => DonorProfileInputDto)
  donor_profile?: DonorProfileInputDto;
}
