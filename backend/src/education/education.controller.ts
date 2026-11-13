import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { 
  CreateEducationCategoryDto, 
  UpdateEducationCategoryDto,
  CreateEducationDocumentDto,
  UpdateEducationDocumentDto,
  EducationFilterDto
} from './dto/education.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, Public } from '../common/decorators';
import { RoleCode } from '../common/enums';

/**
 * Controller cung cấp API đọc và quản trị danh mục, tài liệu giáo dục hiến máu.
 */
@ApiTags('Education')
@Controller('api/v1/education')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  /**
   * Lấy danh sách danh mục tài liệu giáo dục công khai.
   */
  // --- PUBLIC ROUTES (If you want users to view documents without login, you can use @Public()) ---
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách danh mục tài liệu' })
  async getCategories() {
    return await this.educationService.getCategories();
  }

  /**
   * Lấy danh sách tài liệu giáo dục (bao gồm bản nháp nếu là Admin/Moderator).
   */
  @Public()
  @Get('documents')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu' })
  async getDocuments(@Req() req: any, @Query() query: EducationFilterDto) {
    const role = String(req.user?.role_code || '').toLowerCase();
    const includeDrafts = role === String(RoleCode.ADMIN).toLowerCase() || role === String(RoleCode.MODERATOR).toLowerCase();
    return await this.educationService.getDocuments(query, includeDrafts);
  }

  /**
   * Lấy chi tiết tài liệu giáo dục theo slug.
   */
  @Public()
  @Get('documents/:slug')
  @ApiOperation({ summary: 'Lấy chi tiết tài liệu bằng slug' })
  async getDocumentBySlug(@Param('slug') slug: string) {
    return await this.educationService.getDocumentBySlug(slug);
  }

  /**
   * Lấy danh sách tài liệu giáo dục liên quan theo slug.
   */
  @Public()
  @Get('documents/:slug/related')
  @ApiOperation({ summary: 'Lấy tài liệu liên quan' })
  async getRelatedDocuments(@Param('slug') slug: string) {
    return await this.educationService.getRelatedDocuments(slug);
  }

  /**
   * Tạo mới danh mục tài liệu giáo dục (Admin/Moderator).
   */
  // --- ADMIN ROUTES ---
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('categories')
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  async createCategory(@Body() dto: CreateEducationCategoryDto) {
    return await this.educationService.createCategory(dto);
  }

  /**
   * Cập nhật danh mục tài liệu giáo dục theo ID.
   */
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('categories/:id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEducationCategoryDto) {
    return await this.educationService.updateCategory(id, dto);
  }

  /**
   * Xóa danh mục tài liệu giáo dục theo ID.
   */
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Xóa danh mục' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.educationService.deleteCategory(id);
  }

  /**
   * Thêm mới tài liệu giáo dục gắn với tác giả hiện tại.
   */
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('documents')
  @ApiOperation({ summary: 'Thêm tài liệu' })
  async createDocument(@Req() req: any, @Body() dto: CreateEducationDocumentDto) {
    return await this.educationService.createDocument(req.user.user_id, dto);
  }

  /**
   * Cập nhật nội dung tài liệu giáo dục theo ID.
   */
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('documents/:id')
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  async updateDocument(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEducationDocumentDto) {
    return await this.educationService.updateDocument(id, dto);
  }

  /**
   * Xóa tài liệu giáo dục theo ID.
   */
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('documents/:id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return await this.educationService.deleteDocument(id);
  }
}
