import { IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination.dto';

export class UserFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by Role ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;
}
