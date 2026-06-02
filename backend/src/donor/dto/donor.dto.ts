import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BookDonationSlotDto {
  @ApiProperty({ example: 1, description: 'ID của lịch hiến máu (Facility Schedule)' })
  @IsInt()
  @IsNotEmpty()
  schedule_id: number;

  @ApiProperty({ example: 'Tôi muốn hiến vào buổi sáng', description: 'Ghi chú thêm', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSlotStatusDto {
  @ApiProperty({ example: 'COMPLETED', description: 'Trạng thái slot hiến máu (VD: COMPLETED, CANCELLED)' })
  @IsString()
  @IsNotEmpty()
  status: string; // VD: 'COMPLETED', 'CANCELLED'
}

export class RecordDonationDto {
  @ApiProperty({ example: 1, description: 'ID của cơ sở y tế' })
  @IsInt()
  @Type(() => Number)
  facility_id: number;

  @ApiProperty({ example: 5, description: 'ID của người hiến máu' })
  @IsInt()
  @Type(() => Number)
  donor_user_id: number;

  @ApiProperty({ example: 2, description: 'ID nhóm máu' })
  @IsInt()
  @Type(() => Number)
  blood_type_id: number;

  @ApiProperty({ example: 3, description: 'ID thành phần máu' })
  @IsInt()
  @Type(() => Number)
  component_id: number;

  @ApiProperty({ example: 350, description: 'Thể tích máu hiến (ml)' })
  @IsNumber()
  @Type(() => Number)
  volume_ml: number;

  @ApiProperty({ example: '2026-05-31T00:00:00Z', description: 'Ngày hiến máu' })
  @IsDateString()
  donation_date: string;
}

export class UpdateDonorProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ tên', required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: '0123456789', description: 'Số điện thoại', required: false })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ example: '012345678912', description: 'CCCD/CMND', required: false })
  @IsString()
  @IsOptional()
  identity_card?: string;

  @ApiProperty({ example: '1990-01-01', description: 'Ngày sinh', required: false })
  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @ApiProperty({ example: 'M', description: 'Giới tính (M, F, O)', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: '123 Đường ABC, Quận X', description: 'Địa chỉ', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 1, description: 'ID Nhóm máu', required: false })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  blood_type_id?: number;

  @ApiProperty({ example: 65.5, description: 'Cân nặng (kg)', required: false })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  weight_kg?: number;

  @ApiProperty({ example: 170, description: 'Chiều cao (cm)', required: false })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  height_cm?: number;

  @ApiProperty({ example: 'Sức khỏe tốt', description: 'Ghi chú sức khỏe', required: false })
  @IsString()
  @IsOptional()
  health_notes?: string;

  @ApiProperty({ example: 'Nguyễn Thị B', description: 'Người liên hệ khẩn cấp', required: false })
  @IsString()
  @IsOptional()
  emergency_contact_name?: string;

  @ApiProperty({ example: '0987654321', description: 'SĐT khẩn cấp', required: false })
  @IsString()
  @IsOptional()
  emergency_contact_phone?: string;
}
