import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/blog.dto';
import { BlogFilterDto } from '../dto/blog-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-004 BlogService.updatePost', () => {
  let prisma: any; let service: BlogService;
  const D0 = new Date('2026-10-01T00:00:00Z');
  const NOW = new Date('2026-11-03T08:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { blog_posts: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ post_id: 1 }) } };
    service = new BlogService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 draft becomes published', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1, is_published: false, published_at: null });
    expect(await service.updatePost(1, { slug: 'hien-mau-cuu-nguoi', is_published: true } as any)).toEqual({ post_id: 1 });
    expect(prisma.blog_posts.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_published: true, published_at: NOW }) }));
  });
  it('UTCID02 already published keeps published_at', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1, is_published: true, published_at: D0 });
    await service.updatePost(1, { slug: 'hien-mau-cuu-nguoi', is_published: true } as any);
    expect(prisma.blog_posts.update.mock.calls[0][0].data.published_at).toBe(D0);
  });
  it('UTCID03 unpublish', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1, is_published: true, published_at: D0 });
    await service.updatePost(1, { slug: 'hien-mau-cuu-nguoi', is_published: false } as any);
    expect(prisma.blog_posts.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ is_published: false, published_at: D0 }) }));
  });
  it('UTCID04 post not found', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue(null);
    await expectErr(service.updatePost(999, { slug: 'x', is_published: true } as any), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_posts.update).not.toHaveBeenCalled();
  });
  it('UTCID05 duplicate slug -> BadRequest (SRS; defect: code propagates P2002)', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1, is_published: true, published_at: D0 });
    prisma.blog_posts.update.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    await expectErr(service.updatePost(1, { slug: 'slug-trung', is_published: true } as any), BadRequestException, 'Slug đã tồn tại');
  });
});

describe('BLOG-004 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vPost = { title: 'Hiến máu cứu người', slug: 'hien-mau-cuu-nguoi', content: '<p>Nội dung</p>', blog_category_id: 1, is_published: true };
  const vCat = { category_name: 'Tin tức', slug: 'tin-tuc' };
  const vCmt = { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' };

  it('UTCID06 empty title', async () => {
    await expectDtoErr(validate(UpdatePostDto, { ...vPost, title: '' }, 'body'), "Tiêu đề không được để trống");
  });
  it('UTCID07 empty slug', async () => {
    await expectDtoErr(validate(UpdatePostDto, { ...vPost, slug: '' }, 'body'), "Slug không được để trống");
  });
  it('UTCID08 missing blog_category_id (PUT needs full body)', async () => {
    await expectDtoErr(validate(UpdatePostDto, { ...vPost, blog_category_id: undefined }, 'body'), "blog_category_id must be an integer number");
  });
});
