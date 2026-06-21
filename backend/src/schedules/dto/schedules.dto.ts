import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsNotEmpty, IsDateString, Matches } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

export class CreateScheduleDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  facility_id: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  start_time: string; // HH:mm or HH:mm:ss

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  end_time: string; // HH:mm or HH:mm:ss

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  max_donors?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  terms_html?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  facility_id?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  start_time?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  max_donors?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  terms_html?: string;
}

export class ScheduleFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  facility_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;
}
