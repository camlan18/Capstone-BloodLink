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

@ApiTags('Education')
@Controller('api/v1/education')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  // --- PUBLIC ROUTES (If you want users to view documents without login, you can use @Public()) ---
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách danh mục tài liệu' })
  async getCategories() {
    return await this.educationService.getCategories();
  }

  @Public()
  @Get('documents')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu' })
  async getDocuments(@Query() query: EducationFilterDto) {
    return await this.educationService.getDocuments(query);
  }

  @Public()
  @Get('documents/:slug')
  @ApiOperation({ summary: 'Lấy chi tiết tài liệu bằng slug' })
  async getDocumentBySlug(@Param('slug') slug: string) {
    return await this.educationService.getDocumentBySlug(slug);
  }

  @Public()
  @Get('documents/:slug/related')
  @ApiOperation({ summary: 'Lấy tài liệu liên quan' })
  async getRelatedDocuments(@Param('slug') slug: string) {
    return await this.educationService.getRelatedDocuments(slug);
  }

  // --- ADMIN ROUTES ---
  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('categories')
  @ApiOperation({ summary: 'Tạo danh mục mới' })
  async createCategory(@Body() dto: CreateEducationCategoryDto) {
    return await this.educationService.createCategory(dto);
  }

  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('categories/:id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEducationCategoryDto) {
    return await this.educationService.updateCategory(id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Xóa danh mục' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return await this.educationService.deleteCategory(id);
  }

  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Post('documents')
  @ApiOperation({ summary: 'Thêm tài liệu' })
  async createDocument(@Req() req: any, @Body() dto: CreateEducationDocumentDto) {
    return await this.educationService.createDocument(req.user.user_id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Put('documents/:id')
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  async updateDocument(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEducationDocumentDto) {
    return await this.educationService.updateDocument(id, dto);
  }

  @ApiBearerAuth()
  @Roles(RoleCode.ADMIN, RoleCode.MODERATOR)
  @Delete('documents/:id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return await this.educationService.deleteDocument(id);
  }
}
