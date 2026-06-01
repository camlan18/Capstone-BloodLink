import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { CreatePostDto, UpdatePostDto, AddCommentDto } from './dto/blog.dto';
import { BlogFilterDto } from './dto/blog-filter.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return await this.prisma.blog_categories.findMany({
      orderBy: { category_name: 'asc' },
    });
  }

  async getAllPosts(query: BlogFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { is_published: true };
    if (query.category_id) {
      where.blog_category_id = query.category_id;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
      ];
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.published_at = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.blog_posts.findMany({
        where,
        skip,
        take: limit,
        include: { category: true, author: { select: { full_name: true, avatar_url: true } } },
        orderBy,
      }),
      this.prisma.blog_posts.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPostBySlug(slug: string) {
    const post = await this.prisma.blog_posts.findUnique({
      where: { slug },
      include: {
        category: true,
        author: { select: { full_name: true, avatar_url: true } },
      },
    });

    if (!post || !post.is_published) {
      throw new NotFoundException('Bài viết không tồn tại');
    }

    // Tăng lượt view (Fire and forget)
    this.prisma.blog_posts.update({
      where: { post_id: post.post_id },
      data: { view_count: { increment: 1 } },
    }).catch(console.error);

    return post;
  }

  async getRelatedPosts(slug: string) {
    const post = await this.prisma.blog_posts.findUnique({ where: { slug } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    
    return await this.prisma.blog_posts.findMany({
      where: {
        blog_category_id: post.blog_category_id,
        is_published: true,
        post_id: { not: post.post_id }
      },
      take: 3,
      orderBy: { view_count: 'desc' },
      include: { category: true, author: { select: { full_name: true, avatar_url: true } } }
    });
  }

  async addComment(postId: number, userId: number | null, data: AddCommentDto) {
    const post = await this.prisma.blog_posts.findUnique({ where: { post_id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');

    return await this.prisma.blog_comments.create({
      data: {
        post_id: postId,
        user_id: userId,
        guest_name: userId ? null : data.guest_name,
        content: data.content,
        parent_comment_id: data.parent_comment_id,
        is_approved: userId ? true : false, // Member auto approve, Guest must be verified
      },
    });
  }

  async getComments(postId: number) {
    return await this.prisma.blog_comments.findMany({
      where: { post_id: postId, is_approved: true, parent_comment_id: null },
      include: {
        user: { select: { full_name: true, avatar_url: true } },
        replies: {
          where: { is_approved: true },
          include: { user: { select: { full_name: true, avatar_url: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Admin / Content Creator functions
  async createPost(userId: number, dto: CreatePostDto) {
    const existing = await this.prisma.blog_posts.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Slug đã tồn tại');

    return await this.prisma.blog_posts.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        content_html: dto.content,
        summary: dto.summary,
        thumbnail_url: dto.thumbnail_url,
        blog_category_id: dto.blog_category_id,
        author_user_id: userId,
        is_published: dto.is_published || false,
        published_at: dto.is_published ? new Date() : null,
      }
    });
  }

  async updatePost(postId: number, dto: UpdatePostDto) {
    const post = await this.prisma.blog_posts.findUnique({ where: { post_id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');

    return await this.prisma.blog_posts.update({
      where: { post_id: postId },
      data: {
        title: dto.title,
        slug: dto.slug,
        content_html: dto.content,
        summary: dto.summary,
        thumbnail_url: dto.thumbnail_url,
        blog_category_id: dto.blog_category_id,
        is_published: dto.is_published,
        published_at: dto.is_published && !post.is_published ? new Date() : post.published_at,
      }
    });
  }

  async deletePost(postId: number) {
    const post = await this.prisma.blog_posts.findUnique({ where: { post_id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');

    await this.prisma.blog_posts.delete({ where: { post_id: postId } });
    return { message: 'Đã xóa bài viết' };
  }

  // Moderator functions
  async getPendingComments(query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.blog_comments.findMany({
        where: { is_approved: false },
        skip,
        take: limit,
        include: { post: { select: { title: true } } },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.blog_comments.count({ where: { is_approved: false } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveComment(commentId: number, isApproved: boolean) {
    const comment = await this.prisma.blog_comments.findUnique({ where: { comment_id: commentId } });
    if (!comment) throw new NotFoundException('Bình luận không tồn tại');

    if (!isApproved) {
      await this.prisma.blog_comments.delete({ where: { comment_id: commentId } });
      return { message: 'Đã từ chối và xóa bình luận' };
    }

    return await this.prisma.blog_comments.update({
      where: { comment_id: commentId },
      data: { is_approved: true },
    });
  }
}
