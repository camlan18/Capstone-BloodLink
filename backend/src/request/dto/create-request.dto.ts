import { IsInt, IsNotEmpty, IsString, IsPositive, IsBoolean, IsOptional, Max, Min, MaxLength, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({ example: 1, description: 'ID cơ sở y tế yêu cầu' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  facility_id: number;

  @ApiProperty({ example: 'Trần Văn B', description: 'Tên bệnh nhân' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  patient_name: string;

  @ApiProperty({ example: 2, description: 'ID nhóm máu cần' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  blood_type_id: number;

  @ApiProperty({ example: 3, description: 'ID thành phần máu cần' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  component_id: number;

  @ApiProperty({ example: 2, description: 'Số đơn vị máu cần thiết (1-20)' })
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  units_needed: number;

  @ApiProperty({ example: 1, description: 'Mức độ khẩn cấp' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  urgency_id: number;

  @ApiProperty({ example: true, description: 'Đánh dấu là trường hợp cấp cứu khẩn' })
  @IsBoolean()
  is_emergency: boolean;

  @ApiProperty({ example: 'Bệnh nhân mất máu nhiều do tai nạn', description: 'Ghi chú lâm sàng', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  clinical_notes?: string;

  @ApiProperty({ example: '0901234567', description: 'Số điện thoại bệnh nhân', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  patient_phone?: string;

  @ApiProperty({ example: 'Bệnh viện Chợ Rẫy', description: 'Tên bệnh viện', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hospital_name?: string;

  @ApiProperty({ example: 'Khoa Hồi sức cấp cứu, Phòng 102', description: 'Phòng / Khoa', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward_room?: string;

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

  @ApiProperty({ example: 1, description: 'ID Phường/Xã', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ward_id?: number;

  @ApiProperty({ example: '123 Đường ABC', description: 'Địa chỉ chi tiết', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ example: 10.7769, description: 'Vĩ độ', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiProperty({ example: 106.7009, description: 'Kinh độ', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ example: '2023-12-31T23:59:59Z', description: 'Cần trước ngày', required: false })
  @IsOptional()
  @IsDateString()
  required_before?: string;
}
