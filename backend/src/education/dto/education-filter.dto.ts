import { IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination.dto';

export class EducationCategoryFilterDto extends PaginationDto {}

export class EducationDocumentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional({ description: 'Lọc theo nhóm máu' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  blood_type_id?: number;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái xuất bản' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_published?: boolean;
}
