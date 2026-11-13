import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';

/**
 * Module quản lý tin tức, bài viết blog, danh mục và kiểm duyệt bình luận.
 */
@Module({
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
