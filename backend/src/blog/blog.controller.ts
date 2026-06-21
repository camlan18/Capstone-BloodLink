import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Public, Roles } from '../common/decorators';
import { RoleCode } from '../common/enums';
import { PaginationDto } from '../common/pagination.dto';
import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from './dto/blog.dto';
import { BlogFilterDto } from './dto/blog-filter.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get('categories')
  async getCategories() {
    return await this.blogService.getCategories();
  }

  @Public()
  @Get('posts')
  async getAllPosts(@Query() query: BlogFilterDto) {
    return await this.blogService.getAllPosts(query);
  }

  @Public()
  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return await this.blogService.getPostBySlug(slug);
  }

  @Public()
  @Get('posts/:slug/related')
  async getRelatedPosts(@Param('slug') slug: string) {
    return await this.blogService.getRelatedPosts(slug);
  }

  @Public()
  @Get('posts/:id/comments')
  async getComments(@Param('id') id: string, @Query() query: any) {
    return await this.blogService.getComments(Number(id), query);
  }

  @Public() 
  @Post('posts/:id/comments')
  async addComment(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() body: AddCommentDto) {
    const userId = (req.user && typeof req.user === 'object' && req.user.user_id) ? req.user.user_id : null;
    return await this.blogService.addComment(id, userId, body);
  }

  @Put('comments/:id')
  async editMyComment(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body('content') content: string) {
    return await this.blogService.editComment(id, req.user.user_id, content);
  }

  @Delete('comments/:id')
  async deleteMyComment(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return await this.blogService.deleteMyComment(id, req.user.user_id);
  }

  // --- ADMIN / CONTENT CREATOR ROUTES (CATEGORIES) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return await this.blogService.createCategory(dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('categories/:id')
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return await this.blogService.updateCategory(id, dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deleteCategory(id);
  }

  // --- ADMIN / CONTENT CREATOR ROUTES (POSTS) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('posts')
  async createPost(@Req() req: any, @Body() dto: CreatePostDto) {
    return await this.blogService.createPost(req.user.user_id, dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('posts/:id')
  async updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return await this.blogService.updatePost(id, dto);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('posts/:id')
  async deletePost(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deletePost(id);
  }

  // --- MODERATOR ROUTES (Comments) ---
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Get('admin/comments')
  async getAdminComments(@Query() query: any) {
    return await this.blogService.getAdminComments(query);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('admin/comments/:id/approve')
  async approveComment(@Param('id', ParseIntPipe) id: number, @Body('is_approved') isApproved: boolean) {
    return await this.blogService.approveComment(id, isApproved);
  }

  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('admin/comments/:id')
  async deleteAdminComment(@Param('id', ParseIntPipe) id: number) {
    return await this.blogService.deleteAdminComment(id);
  }
}
