import { NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr, errOf } from './_helpers';

describe('BLOG-005 BlogService.deletePost', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = { blog_posts: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) } };
    service = new BlogService(prisma as any);
  });
  it('UTCID01 delete existing', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1 });
    expect(await service.deletePost(1)).toEqual({ message: 'Đã xóa bài viết' });
    expect(prisma.blog_posts.delete).toHaveBeenCalledWith({ where: { post_id: 1 } });
  });
  it('UTCID02 not found 999', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue(null);
    await expectErr(service.deletePost(999), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_posts.delete).not.toHaveBeenCalled();
  });
  it('UTCID03 not found 0', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue(null);
    await expectErr(service.deletePost(0), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_posts.delete).not.toHaveBeenCalled();
  });
  it('UTCID04 FK error propagates', async () => {
    const err = Object.assign(new Error('FK'), { code: 'P2003' });
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1 });
    prisma.blog_posts.delete.mockRejectedValue(err);
    expect(await errOf(service.deletePost(1))).toBe(err);
    expect(prisma.blog_posts.delete).toHaveBeenCalledTimes(1);
  });
});
