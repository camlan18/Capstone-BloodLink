import { IsString, IsOptional, IsInt, MaxLength, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEducationDocumentDto {
  @ApiProperty({ example: 1, description: 'ID danh mục' })
  @IsInt()
  @IsNotEmpty()
  category_id: number;

  @ApiPropertyOptional({ example: 2, description: 'ID nhóm máu liên quan (nếu có)' })
  @IsInt()
  @IsOptional()
  blood_type_id?: number;

  @ApiProperty({ example: 'Quy trình hiến máu an toàn', description: 'Tiêu đề bài viết', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'quy-trinh-hien-mau-an-toan', description: 'Đường dẫn tĩnh (Slug)', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  slug: string;

  @ApiPropertyOptional({ example: 'Tóm tắt quy trình các bước hiến máu', description: 'Tóm tắt', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  summary?: string;

  @ApiProperty({ example: '<p>Nội dung chi tiết...</p>', description: 'Nội dung HTML' })
  @IsString()
  @IsNotEmpty()
  content_html: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'Ảnh đại diện', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnail_url?: string;

  @ApiPropertyOptional({ example: true, description: 'Hiển thị công khai', default: true })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}

export class UpdateEducationDocumentDto {
  @ApiPropertyOptional({ example: 1, description: 'ID danh mục' })
  @IsInt()
  @IsOptional()
  category_id?: number;

  @ApiPropertyOptional({ example: 2, description: 'ID nhóm máu liên quan' })
  @IsInt()
  @IsOptional()
  blood_type_id?: number;

  @ApiPropertyOptional({ example: 'Quy trình hiến máu an toàn', description: 'Tiêu đề bài viết', maxLength: 300 })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: 'quy-trinh-hien-mau-an-toan', description: 'Đường dẫn tĩnh (Slug)', maxLength: 300 })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  slug?: string;

  @ApiPropertyOptional({ example: 'Tóm tắt quy trình các bước hiến máu', description: 'Tóm tắt', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  summary?: string;

  @ApiPropertyOptional({ example: '<p>Nội dung chi tiết...</p>', description: 'Nội dung HTML' })
  @IsString()
  @IsOptional()
  content_html?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'Ảnh đại diện', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  thumbnail_url?: string;

  @ApiPropertyOptional({ example: true, description: 'Hiển thị công khai' })
  @IsBoolean()
  @IsOptional()
  is_published?: boolean;
}
