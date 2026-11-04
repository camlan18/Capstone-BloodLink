import { BadRequestException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr, errOf } from './_helpers';

describe('BLOG-003 BlogService.createPost', () => {
  let prisma: any; let service: BlogService;
  const dto = (o: any = {}) => ({ title: 'T', slug: 'hien-mau-cuu-nguoi', content: '<p>x</p>', summary: 's', blog_category_id: 1, ...o });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    prisma = { blog_posts: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ post_id: 1 }) } };
    service = new BlogService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 published post', async () => {
    expect(await service.createPost(1, dto({ is_published: true }) as any)).toEqual({ post_id: 1 });
    expect(prisma.blog_posts.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      author_user_id: 1, content_html: '<p>x</p>', is_published: true, published_at: new Date('2026-11-03T08:00:00Z') }) });
  });
  it('UTCID02 draft post', async () => {
    expect(await service.createPost(1, dto({ is_published: false }) as any)).toEqual({ post_id: 1 });
    expect(prisma.blog_posts.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_published: false, published_at: null }) });
  });
  it('UTCID03 is_published undefined', async () => {
    await service.createPost(1, dto() as any);
    expect(prisma.blog_posts.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_published: false, published_at: null }) });
  });
  it('UTCID04 duplicate slug', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 9 });
    await expectErr(service.createPost(1, dto({ slug: 'slug-trung', is_published: true }) as any), BadRequestException, 'Slug đã tồn tại');
    expect(prisma.blog_posts.create).not.toHaveBeenCalled();
  });
  it('UTCID05 FK error propagates', async () => {
    const err = Object.assign(new Error('FK'), { code: 'P2003' });
    prisma.blog_posts.create.mockRejectedValue(err);
    expect(await errOf(service.createPost(1, dto({ is_published: true }) as any))).toBe(err);
    expect(prisma.blog_posts.create).toHaveBeenCalledTimes(1);
  });
});
