import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBloodTypeDto {
  @ApiProperty({ example: 'O', description: 'Nhóm máu (VD: A, B, AB, O)' })
  @IsString()
  @IsNotEmpty()
  blood_group: string; // VD: 'A', 'B', 'AB', 'O'

  @ApiProperty({ example: '+', description: 'Yếu tố Rh (VD: +, -)' })
  @IsString()
  @IsNotEmpty()
  rh_factor: string; // VD: '+', '-'

  @ApiProperty({ example: 1, description: 'Thứ tự hiển thị', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

export class UpdateBloodTypeDto extends CreateBloodTypeDto {
  @ApiProperty({ example: true, description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateFacilityDto {
  @ApiProperty({ example: 'FAC-001', description: 'Mã cơ sở y tế', required: false })
  @IsOptional()
  @IsString()
  facility_code?: string;

  @ApiProperty({ example: 'Bệnh viện Huyết học Truyền máu', description: 'Tên cơ sở y tế' })
  @IsString()
  @IsNotEmpty()
  facility_name: string;

  @ApiProperty({ example: 'BVHHTM', description: 'Tên viết tắt', required: false })
  @IsOptional()
  @IsString()
  short_name?: string;

  @ApiProperty({ example: '118 Hồng Bàng, Q5, TP.HCM', description: 'Địa chỉ cơ sở y tế' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 1, description: 'ID Tỉnh/Thành phố', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  province_id?: number;

  @ApiProperty({ example: 1, description: 'ID Quận/Huyện', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  district_id?: number;

  @ApiProperty({ example: 1, description: 'ID Xã/Phường', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ward_id?: number;

  @ApiProperty({ example: '02812345678', description: 'Số điện thoại', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'contact@bthh.vn', description: 'Email liên hệ', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'https://bthh.vn', description: 'Website', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 10.754, description: 'Vĩ độ', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({ example: 106.666, description: 'Kinh độ', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ example: 'https://bthh.vn/logo.png', description: 'Logo URL', required: false })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiProperty({ example: true, description: 'Đánh dấu là cơ sở y tế chính', required: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class UpdateFacilityDto extends CreateFacilityDto {
  @ApiProperty({ example: true, description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// DTOs for Blood Components
export class CreateBloodComponentDto {
  @ApiProperty({ example: 'WB', description: 'Mã thành phần máu' })
  @IsString()
  @IsNotEmpty()
  component_code: string;

  @ApiProperty({ example: 'Máu toàn phần', description: 'Tên thành phần máu' })
  @IsString()
  @IsNotEmpty()
  component_name: string;

  @ApiProperty({ example: '...', description: 'Mô tả chi tiết', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBloodComponentDto extends CreateBloodComponentDto {
  @ApiProperty({ example: true, description: 'Trạng thái', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// DTOs for Blood Compatibility
export class CreateBloodCompatibilityDto {
  @ApiProperty({ example: 1, description: 'ID thành phần máu' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  component_id: number;

  @ApiProperty({ example: 1, description: 'ID nhóm máu người hiến' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  donor_blood_type_id: number;

  @ApiProperty({ example: 2, description: 'ID nhóm máu người nhận' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  recipient_blood_type_id: number;

  @ApiProperty({ example: true, description: 'Được phép truyền?', required: false })
  @IsOptional()
  @IsBoolean()
  is_compatible?: boolean;

  @ApiProperty({ example: 'Ghi chú...', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBloodCompatibilityDto extends CreateBloodCompatibilityDto {}

// DTOs for Donation Interval Rules
export class CreateDonationIntervalRuleDto {
  @ApiProperty({ example: 1, description: 'ID thành phần máu' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  component_id: number;

  @ApiProperty({ example: 84, description: 'Khoảng cách tối thiểu (ngày)' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  min_interval_days: number;

  @ApiProperty({ example: 4, description: 'Số lần tối đa/năm', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  max_donations_per_year?: number;

  @ApiProperty({ example: 'Mô tả...', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDonationIntervalRuleDto extends CreateDonationIntervalRuleDto {
  @ApiProperty({ example: true, description: 'Trạng thái', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
