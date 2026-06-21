import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertSettingDto {
  @ApiProperty({ description: 'Khóa cài đặt (VD: APP_NAME, MAINTENANCE_MODE)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  setting_key: string;

  @ApiProperty({ description: 'Giá trị cài đặt' })
  @IsString()
  @IsNotEmpty()
  setting_value: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
