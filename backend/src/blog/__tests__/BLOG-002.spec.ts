import { NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-002 BlogService.getPostBySlug', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = { blog_posts: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    service = new BlogService(prisma as any);
  });

  it('UTCID01 published post returned and view incremented', async () => {
    const post = { post_id: 1, is_published: true, category: {}, author: {} };
    prisma.blog_posts.findUnique.mockResolvedValue(post);
    expect(await service.getPostBySlug('hien-mau-cuu-nguoi')).toBe(post);
    expect(prisma.blog_posts.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { post_id: 1 }, data: { view_count: { increment: 1 } } }));
  });
  it('UTCID02 not found', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue(null);
    await expectErr(service.getPostBySlug('khong-ton-tai'), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_posts.update).not.toHaveBeenCalled();
  });
  it('UTCID03 draft post', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 2, is_published: false });
    await expectErr(service.getPostBySlug('bai-nhap'), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_posts.update).not.toHaveBeenCalled();
  });
  it('UTCID04 view update rejection swallowed', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const post = { post_id: 1, is_published: true };
    prisma.blog_posts.findUnique.mockResolvedValue(post);
    prisma.blog_posts.update.mockRejectedValue(new Error('db'));
    expect(await service.getPostBySlug('hien-mau-cuu-nguoi')).toBe(post);
    await new Promise((r) => setImmediate(r));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
