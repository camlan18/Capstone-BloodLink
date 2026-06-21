import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hiến máu cứu người', description: 'Tiêu đề bài viết' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({ example: 'hien-mau-cuu-nguoi', description: 'Đường dẫn thân thiện (slug)' })
  @IsString()
  @IsNotEmpty({ message: 'Slug không được để trống' })
  slug: string;

  @ApiProperty({ example: '<p>Nội dung bài viết...</p>', description: 'Nội dung chi tiết của bài viết' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @ApiProperty({ example: 'Bài viết về tầm quan trọng của việc hiến máu', description: 'Tóm tắt bài viết', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'URL ảnh thu nhỏ', required: false })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({ example: 1, description: 'ID danh mục bài viết' })
  @IsInt()
  @Type(() => Number)
  blog_category_id: number;

  @ApiProperty({ example: true, description: 'Trạng thái xuất bản', required: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdatePostDto extends CreatePostDto {}

export class AddCommentDto {
  @ApiProperty({ example: 'Bài viết rất hay', description: 'Nội dung bình luận' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;

  @ApiProperty({ example: 'Khách', description: 'Tên người dùng nếu không đăng nhập', required: false })
  @IsOptional()
  @IsString()
  guest_name?: string;

  @ApiProperty({ example: 2, description: 'ID bình luận cha (nếu có)', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parent_comment_id?: number;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tin tức', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  category_name: string;

  @ApiProperty({ example: 'tin-tuc', description: 'Đường dẫn danh mục' })
  @IsString()
  @IsNotEmpty({ message: 'Slug không được để trống' })
  slug: string;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
