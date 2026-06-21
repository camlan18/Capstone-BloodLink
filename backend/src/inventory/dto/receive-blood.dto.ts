import { IsInt, IsNotEmpty, IsString, IsPositive, IsDateString, IsOptional, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReceiveBloodDto {
  @ApiProperty({ example: 1, description: 'ID cơ sở y tế' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  facility_id: number;

  @ApiProperty({ example: 2, description: 'ID nhóm máu' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  blood_type_id: number;

  @ApiProperty({ example: 3, description: 'ID thành phần máu' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  component_id: number;

  @ApiProperty({ example: 'BAG-20260531-123', description: 'Mã túi máu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  bag_code: string;

  @ApiProperty({ example: 350, description: 'Thể tích (ml)' })
  @IsInt()
  @IsPositive()
  @Min(50)
  @Type(() => Number)
  volume_ml: number;

  @ApiProperty({ example: '2026-05-31T08:00:00Z', description: 'Ngày thu thập máu' })
  @IsDateString()
  collection_date: Date;

  @ApiProperty({ example: '2026-07-05T08:00:00Z', description: 'Ngày hết hạn' })
  @IsDateString()
  expiry_date: Date;

  @ApiProperty({ example: 10, description: 'ID lượt hiến máu gốc (nếu có)', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  source_donation_id?: number;

  @ApiProperty({ example: 'Máu đạt chất lượng tốt', description: 'Ghi chú thêm', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
