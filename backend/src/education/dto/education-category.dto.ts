import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEducationCategoryDto {
  @ApiProperty({ example: 'Kiến thức cơ bản', description: 'Tên danh mục', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  category_name: string;

  @ApiPropertyOptional({ example: 'Các kiến thức cơ bản về hiến máu', description: 'Mô tả', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự hiển thị', default: 0 })
  @IsInt()
  @IsOptional()
  sort_order?: number;
}

export class UpdateEducationCategoryDto {
  @ApiPropertyOptional({ example: 'Kiến thức cơ bản', description: 'Tên danh mục', maxLength: 150 })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  category_name?: string;

  @ApiPropertyOptional({ example: 'Các kiến thức cơ bản về hiến máu', description: 'Mô tả', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Thứ tự hiển thị' })
  @IsInt()
  @IsOptional()
  sort_order?: number;
}
