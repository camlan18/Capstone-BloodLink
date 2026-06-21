import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEducationCategoryDto {
  @ApiProperty({ example: 'Hướng dẫn hiến máu', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  category_name: string;

  @ApiProperty({ example: 'Mo ta ngan', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort_order?: number;
}

export class UpdateEducationCategoryDto extends CreateEducationCategoryDto {}

export class CreateEducationDocumentDto {
  @ApiProperty({ example: 'Hiến máu cứu người', description: 'Tiêu đề' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({ example: 'hien-mau-cuu-nguoi', description: 'Đường dẫn (slug)' })
  @IsString()
  @IsNotEmpty({ message: 'Slug không được để trống' })
  slug: string;

  @ApiProperty({ example: '<p>Nội dung...</p>', description: 'Nội dung chi tiết' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content_html: string;

  @ApiProperty({ example: 'Tóm tắt', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({ example: 1, description: 'ID danh mục' })
  @IsInt()
  @Type(() => Number)
  category_id: number;

  @ApiProperty({ example: 1, description: 'ID nhóm máu', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  blood_type_id?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdateEducationDocumentDto extends CreateEducationDocumentDto {}

export class EducationFilterDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  blood_type_id?: number;
}
