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
