import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Mảng ID người dùng sẽ nhận thông báo', type: [Number] })
  @IsArray()
  @IsNotEmpty()
  user_ids: number[];

  @ApiProperty({ description: 'Tiêu đề thông báo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Nội dung thông báo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiProperty({ description: 'Loại thông báo (INFO, WARNING, ALERT, SYSTEM)', default: 'INFO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  notification_type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reference_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  reference_id?: number;
}
