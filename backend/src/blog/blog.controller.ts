import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Public, Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { PaginationDto } from '../common/pagination.dto';
import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from './dto/blog.dto';
import { BlogFilterDto } from './dto/blog-filter.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

/**
 * Controller cung cấp API đọc bài viết, gửi bình luận và quản trị nội dung blog.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /**
   * Lấy danh sách danh mục bài viết blog công khai.
   */
  @Public()
  @Get('categories')
  async getCategories() {
    return await this.blogService.getCategories();
  }

  /**
   * Lấy danh sách bài viết blog có lọc theo danh mục và phân trang.
   */
  @Public()
  @Get('posts')
  async getAllPosts(@Query() query: BlogFilterDto) {
    return await this.blogService.getAllPosts(query);
  }

  /**
   * Lấy chi tiết một bài viết blog theo đường dẫn thân thiện (slug).
   */
  @Public()
  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return await this.blogService.getPostBySlug(slug);
  }

  /**
   * Lấy danh sách các bài viết liên quan dựa theo slug bài viết hiện tại.
   */
  @Public()
  @Get('posts/:slug/related')
  async getRelatedPosts(@Param('slug') slug: string) {
    return await this.blogService.getRelatedPosts(slug);
  }

  /**
   * Lấy danh sách bình luận đã duyệt của một bài viết theo ID.
   */
  @Public()
  @Get('posts/:id/comments')
  async getComments(@Param('id') id: string, @Query() query: any) {
    return await this.blogService.getComments(Number(id), query);
  }

  /**
   * Thêm bình luận mới cho bài viết (hỗ trợ cả người dùng đăng nhập và khách).
   */
  @Public() 
  @Post('posts/:id/comments')
  async addComment(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: AddCommentDto) {
    const userId = (req.user && typeof req.user === 'object' && req.user.user_id) ? req.user.user_id : null;
    return await this.blogService.addComment(id, userId, body);
  }

  /**
   * Chỉnh sửa nội dung bình luận của chính người dùng đang đăng nhập.
   */
  @Put('comments/:id')
  async editMyComment(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('content') content: string) {
    return await this.blogService.editComment(id, req.user.user_id, content);
  }

  /**
   * Xóa bình luận của chính người dùng đang đăng nhập.
   */
  @Delete('comments/:id')
  async deleteMyComment(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return await this.blogService.deleteMyComment(id, req.user.user_id);
  }

  /**
   * Tạo mới danh mục bài viết blog (Admin/Moderator).
   */
  // --- ADMIN / CONTENT CREATOR ROUTES (CATEGORIES) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return await this.blogService.createCategory(dto);
  }

  /**
   * Cập nhật danh mục bài viết blog theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('categories/:id')
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return await this.blogService.updateCategory(id, dto);
  }

  /**
   * Xóa danh mục bài viết blog theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deleteCategory(id);
  }

  /**
   * Tạo mới bài viết blog gắn với tác giả hiện tại.
   */
  // --- ADMIN / CONTENT CREATOR ROUTES (POSTS) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('posts')
  async createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    return await this.blogService.createPost(req.user.user_id, dto);
  }

  /**
   * Cập nhật nội dung bài viết blog theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('posts/:id')
  async updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return await this.blogService.updatePost(id, dto);
  }

  /**
   * Xóa bài viết blog theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('posts/:id')
  async deletePost(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deletePost(id);
  }

  /**
   * Lấy toàn bộ bình luận phục vụ trang kiểm duyệt của Admin/Moderator.
   */
  // --- MODERATOR ROUTES (Comments) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Get('admin/comments')
  async getAdminComments(@Query() query: any) {
    return await this.blogService.getAdminComments(query);
  }

  /**
   * Phê duyệt hoặc ẩn một bình luận theo ID.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('admin/comments/:id/approve')
  async approveComment(@Param('id', ParseIntPipe) id: number, @Body('is_approved') isApproved: boolean) {
    return await this.blogService.approveComment(id, isApproved);
  }

  /**
   * Xóa vi phạm một bình luận dưới quyền kiểm duyệt viên.
   */
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('admin/comments/:id')
  async deleteAdminComment(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deleteAdminComment(id);
  }
}
