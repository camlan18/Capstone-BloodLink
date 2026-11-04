import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/blog.dto';
import { BlogFilterDto } from '../dto/blog-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-008 BlogService.addComment/editComment/deleteMyComment/getComments', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = {
      blog_posts: { findUnique: jest.fn() },
      blog_comments: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue({ comment_id: 1 }),
        update: jest.fn().mockResolvedValue({ comment_id: 1 }), delete: jest.fn().mockResolvedValue({}),
        findMany: jest.fn(), count: jest.fn() },
    };
    service = new BlogService(prisma as any);
  });

  it('UTCID01 add comment as member', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1 });
    expect(await service.addComment(1, 1, { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' } as any)).toEqual({ comment_id: 1 });
    expect(prisma.blog_comments.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      user_id: 1, guest_name: null, is_approved: true }) });
  });
  it('UTCID02 add guest comment pending moderation (SRS BR-16; defect: code sets is_approved true)', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue({ post_id: 1 });
    await service.addComment(1, null, { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' } as any);
    expect(prisma.blog_comments.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      user_id: null, guest_name: 'Khách', is_approved: false }) });
  });
  it('UTCID03 add post not found', async () => {
    prisma.blog_posts.findUnique.mockResolvedValue(null);
    await expectErr(service.addComment(999, 1, { content: 'x' } as any), NotFoundException, 'Bài viết không tồn tại');
    expect(prisma.blog_comments.create).not.toHaveBeenCalled();
  });
  it('UTCID04 edit own comment', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1, user_id: 1 });
    expect(await service.editComment(1, 1, 'Nội dung mới')).toEqual({ comment_id: 1 });
    expect(prisma.blog_comments.update).toHaveBeenCalledWith({ where: { comment_id: 1 }, data: { content: 'Nội dung mới' } });
  });
  it('UTCID05 edit other user comment', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1, user_id: 1 });
    await expectErr(service.editComment(1, 2, 'Nội dung mới'), BadRequestException, 'Bạn không có quyền sửa bình luận này');
    expect(prisma.blog_comments.update).not.toHaveBeenCalled();
  });
  it('UTCID06 edit comment not found', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue(null);
    await expectErr(service.editComment(999, 1, 'Nội dung mới'), NotFoundException, 'Bình luận không tồn tại');
    expect(prisma.blog_comments.update).not.toHaveBeenCalled();
  });
  it('UTCID07 delete own comment', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1, user_id: 1 });
    expect(await service.deleteMyComment(1, 1)).toEqual({ message: 'Đã xóa bình luận' });
    expect(prisma.blog_comments.delete).toHaveBeenCalledWith({ where: { comment_id: 1 } });
  });
  it('UTCID08 delete other user comment', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1, user_id: 1 });
    await expectErr(service.deleteMyComment(1, 2), BadRequestException, 'Bạn không có quyền xóa bình luận này');
    expect(prisma.blog_comments.delete).not.toHaveBeenCalled();
  });
  it('UTCID09 delete guest comment', async () => {
    prisma.blog_comments.findUnique.mockResolvedValue({ comment_id: 1, user_id: null });
    await expectErr(service.deleteMyComment(1, 1), BadRequestException, 'Bạn không có quyền xóa bình luận này');
    expect(prisma.blog_comments.delete).not.toHaveBeenCalled();
  });
  it('UTCID10 list comments with pagination', async () => {
    prisma.blog_comments.findMany.mockResolvedValue([{}, {}, {}, {}, {}]);
    prisma.blog_comments.count.mockResolvedValue(7);
    const r = await service.getComments(1, {});
    expect(r.data).toHaveLength(5);
    expect(r.meta).toEqual({ total: 7, page: 1, limit: 5, totalPages: 2 });
    expect(prisma.blog_comments.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { post_id: 1, is_approved: true, parent_comment_id: null }, take: 5,
      orderBy: [{ created_at: 'desc' }, { comment_id: 'desc' }] }));
  });
});

describe('BLOG-008 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vPost = { title: 'Hiến máu cứu người', slug: 'hien-mau-cuu-nguoi', content: '<p>Nội dung</p>', blog_category_id: 1, is_published: true };
  const vCat = { category_name: 'Tin tức', slug: 'tin-tuc' };
  const vCmt = { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' };

  it('UTCID11 add: empty content', async () => {
    await expectDtoErr(validate(AddCommentDto, { ...vCmt, content: '' }, 'body'), "Nội dung bình luận không được để trống");
  });
  it('UTCID12 add: guest_name not a string', async () => {
    await expectDtoErr(validate(AddCommentDto, { ...vCmt, guest_name: 123 }, 'body'), "guest_name must be a string");
  });
  it('UTCID13 add: parent_comment_id not numeric', async () => {
    await expectDtoErr(validate(AddCommentDto, { ...vCmt, parent_comment_id: 'abc' }, 'body'), "parent_comment_id must be an integer number");
  });
  it('UTCID14 add: numeric string parent_comment_id transformed', async () => {
    const out: any = await validate(AddCommentDto, { ...vCmt, parent_comment_id: '2' }, 'body');
    expect(out.parent_comment_id).toBe(2);
  });
  it('UTCID15 add: content longer than NVarChar(2000)', async () => {
    await expectDtoErr(validate(AddCommentDto, { ...vCmt, content: 'a'.repeat(2001) }, 'body'), "content must be shorter than or equal to 2000 characters");
  });
});
