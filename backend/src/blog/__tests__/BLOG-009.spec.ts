import { NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-009 BlogService.getAdminComments/approveComment/deleteAdminComment', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = { blog_comments: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(), update: jest.fn(), delete: jest.fn().mockResolvedValue({}) } };
    service = new BlogService(prisma as any);
  });

  it('UTCID01 list PENDING', async () => {
    prisma.blog_comments.findMany.mockResolvedValue([{}, {}]);
    prisma.blog_comments.count.mockResolvedValue(2);
    const r = await service.getAdminComments({ status: 'PENDING' });
    expect(r.data).toHaveLength(2);
    expect(r.meta.total).toBe(2);
    expect(prisma.blog_comments.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { is_approved: false }, take: 20, orderBy: { created_at: 'desc' } }));
  });
  it('UTCID02 list APPROVED', async () => {
    prisma.blog_comments.findMany.mockResolvedValue([{ is_approved: true }]);
    const r = await service.getAdminComments({ status: 'APPROVED' });
    expect(r.data).toHaveLength(1);
    expect(prisma.blog_comments.findMany.mock.calls[0][0].where).toEqual({ is_approved: true });
  });
  it('UTCID03 list all', async () => {
    prisma.blog_comments.findMany.mockResolvedValue([{}]);
    await service.getAdminComments({});
    expect(prisma.blog_comments.findMany.mock.calls[0][0].where).toEqual({});
  });
  it('UTCID04 approve', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1 });
    prisma.blog_comments.update.mockResolvedValue({ comment_id: 1, is_approved: true });
    expect(await service.approveComment(1, true)).toEqual({ comment_id: 1, is_approved: true });
    expect(prisma.blog_comments.update).toHaveBeenCalledWith({ where: { comment_id: 1 }, data: { is_approved: true } });
  });
  it('UTCID05 hide', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1 });
    prisma.blog_comments.update.mockResolvedValue({ comment_id: 1, is_approved: false });
    expect(await service.approveComment(1, false)).toEqual({ comment_id: 1, is_approved: false });
    expect(prisma.blog_comments.update).toHaveBeenCalledWith({ where: { comment_id: 1 }, data: { is_approved: false } });
  });
  it('UTCID06 approve not found', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue(null);
    await expectErr(service.approveComment(999, true), NotFoundException, 'Bình luận không tồn tại');
    expect(prisma.blog_comments.update).not.toHaveBeenCalled();
  });
  it('UTCID07 delete', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1 });
    expect(await service.deleteAdminComment(1)).toEqual({ message: 'Đã xóa bình luận' });
    expect(prisma.blog_comments.delete).toHaveBeenCalledWith({ where: { comment_id: 1 } });
  });
  it('UTCID08 delete not found', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue(null);
    await expectErr(service.deleteAdminComment(999), NotFoundException, 'Bình luận không tồn tại');
    expect(prisma.blog_comments.delete).not.toHaveBeenCalled();
  });
});
