import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CreateEducationCategoryDto, 
  UpdateEducationCategoryDto,
  CreateEducationDocumentDto,
  UpdateEducationDocumentDto,
  EducationFilterDto
} from './dto/education.dto';

@Injectable()
export class EducationService {
  constructor(private readonly prisma: PrismaService) {}

  // --- CATEGORIES ---
  async getCategories() {
    return await this.prisma.education_document_categories.findMany({
      orderBy: { sort_order: 'asc' },
    });
  }

  async createCategory(dto: CreateEducationCategoryDto) {
    return await this.prisma.education_document_categories.create({
      data: {
        category_name: dto.category_name,
        description: dto.description,
        sort_order: dto.sort_order || 0,
      }
    });
  }

  async updateCategory(id: number, dto: UpdateEducationCategoryDto) {
    const category = await this.prisma.education_document_categories.findUnique({ where: { category_id: id } });
    if (!category) throw new NotFoundException('Danh mục không tồn tại');

    return await this.prisma.education_document_categories.update({
      where: { category_id: id },
      data: {
        category_name: dto.category_name,
        description: dto.description,
        sort_order: dto.sort_order,
      }
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.education_document_categories.findUnique({ 
      where: { category_id: id },
      include: { _count: { select: { education_documents: true } } }
    });
    
    if (!category) throw new NotFoundException('Danh mục không tồn tại');
    
    if (category._count.education_documents > 0) {
      throw new BadRequestException('Không thể xóa danh mục đang có tài liệu');
    }

    await this.prisma.education_document_categories.delete({ where: { category_id: id } });
    return { message: 'Đã xóa danh mục thành công' };
  }

  // --- DOCUMENTS ---
  async getDocuments(query: EducationFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.category_id) where.category_id = query.category_id;
    if (query.blood_type_id) where.blood_type_id = query.blood_type_id;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.education_documents.findMany({
        where,
        skip,
        take: limit,
        include: { 
          category: true, 
          blood_type: true,
          creator: { select: { full_name: true, avatar_url: true } } 
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.education_documents.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDocumentById(id: number) {
    const doc = await this.prisma.education_documents.findUnique({
      where: { document_id: id },
      include: { category: true, blood_type: true, creator: { select: { full_name: true } } },
    });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');
    return doc;
  }

  async getDocumentBySlug(slug: string) {
    const doc = await this.prisma.education_documents.findUnique({
      where: { slug: slug },
      include: { category: true, blood_type: true, creator: { select: { full_name: true } } },
    });
    
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');
    
    // Tăng view count
    await this.prisma.education_documents.update({
      where: { document_id: doc.document_id },
      data: { view_count: { increment: 1 } }
    });

    return doc;
  }

  async getRelatedDocuments(slug: string) {
    const doc = await this.prisma.education_documents.findUnique({ where: { slug } });
    if (!doc) return [];

    return await this.prisma.education_documents.findMany({
      where: { 
        category_id: doc.category_id,
        document_id: { not: doc.document_id },
        is_published: true
      },
      take: 4,
      orderBy: { created_at: 'desc' },
      include: { category: true }
    });
  }

  async createDocument(userId: number, dto: CreateEducationDocumentDto) {
    const existing = await this.prisma.education_documents.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug đã tồn tại');

    return await this.prisma.education_documents.create({
      data: {
        category_id: dto.category_id,
        blood_type_id: dto.blood_type_id,
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content_html: dto.content_html,
        thumbnail_url: dto.thumbnail_url,
        is_published: dto.is_published !== false,
        published_at: dto.is_published !== false ? new Date() : null,
        created_by: userId,
      }
    });
  }

  async updateDocument(id: number, dto: UpdateEducationDocumentDto) {
    const doc = await this.prisma.education_documents.findUnique({ where: { document_id: id } });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');

    if (dto.slug && dto.slug !== doc.slug) {
      const existing = await this.prisma.education_documents.findUnique({ where: { slug: dto.slug } });
      if (existing) throw new BadRequestException('Slug đã tồn tại');
    }

    return await this.prisma.education_documents.update({
      where: { document_id: id },
      data: {
        category_id: dto.category_id,
        blood_type_id: dto.blood_type_id,
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary,
        content_html: dto.content_html,
        thumbnail_url: dto.thumbnail_url,
        is_published: dto.is_published,
        published_at: (dto.is_published && !doc.is_published) ? new Date() : doc.published_at,
        updated_at: new Date(),
      }
    });
  }

  async deleteDocument(id: number) {
    const doc = await this.prisma.education_documents.findUnique({ where: { document_id: id } });
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại');

    await this.prisma.education_documents.delete({ where: { document_id: id } });
    return { message: 'Đã xóa tài liệu' };
  }
}
