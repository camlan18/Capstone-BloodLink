import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SystemSettingKey } from '../../common/enums';

export class UpsertSettingDto {
  @ApiProperty({ description: 'Khóa cài đặt (VD: MAX_SEARCH_RADIUS_KM)', enum: SystemSettingKey })
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase() : value)
  @IsEnum(SystemSettingKey, { message: 'Khóa cài đặt không hợp lệ' })
  @IsNotEmpty()
  @MaxLength(100)
  setting_key: SystemSettingKey;

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
