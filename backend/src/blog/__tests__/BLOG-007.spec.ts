import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-007 BlogService.createCategory/updateCategory/deleteCategory', () => {
  let prisma: any; let service: BlogService;
  const DUP = 'Đường dẫn danh mục (slug) đã tồn tại';
  beforeEach(() => {
    prisma = { blog_categories: { findUnique: jest.fn(), create: jest.fn().mockResolvedValue({ blog_category_id: 1 }),
      update: jest.fn().mockResolvedValue({ blog_category_id: 1 }), delete: jest.fn().mockResolvedValue({}) } };
    service = new BlogService(prisma as any);
  });

  it('UTCID01 create ok', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue(null);
    expect(await service.createCategory({ category_name: 'Tin tức', slug: 'tin-tuc' } as any)).toEqual({ blog_category_id: 1 });
    expect(prisma.blog_categories.create).toHaveBeenCalled();
  });
  it('UTCID02 create duplicate slug', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue({ blog_category_id: 2 });
    await expectErr(service.createCategory({ category_name: 'x', slug: 'slug-trung' } as any), BadRequestException, DUP);
    expect(prisma.blog_categories.create).not.toHaveBeenCalled();
  });
  it('UTCID03 update same slug skips lookup', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue({ blog_category_id: 1, slug: 'tin-tuc' });
    expect(await service.updateCategory(1, { slug: 'tin-tuc' } as any)).toEqual({ blog_category_id: 1 });
    expect(prisma.blog_categories.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.blog_categories.update).toHaveBeenCalled();
  });
  it('UTCID04 update new slug', async () => {
    prisma.blog_categories.findUnique.mockResolvedValueOnce({ blog_category_id: 1, slug: 'tin-tuc' }).mockResolvedValueOnce(null);
    expect(await service.updateCategory(1, { slug: 'su-kien' } as any)).toEqual({ blog_category_id: 1 });
    expect(prisma.blog_categories.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.blog_categories.findUnique).toHaveBeenLastCalledWith({ where: { slug: 'su-kien' } });
    expect(prisma.blog_categories.update).toHaveBeenCalled();
  });
  it('UTCID05 update slug used by other', async () => {
    prisma.blog_categories.findUnique.mockResolvedValueOnce({ blog_category_id: 1, slug: 'tin-tuc' }).mockResolvedValueOnce({ blog_category_id: 2 });
    await expectErr(service.updateCategory(1, { slug: 'slug-trung' } as any), BadRequestException, DUP);
    expect(prisma.blog_categories.update).not.toHaveBeenCalled();
  });
  it('UTCID06 update category not found', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue(null);
    await expectErr(service.updateCategory(999, { slug: 'tin-tuc' } as any), NotFoundException, 'Danh mục không tồn tại');
    expect(prisma.blog_categories.update).not.toHaveBeenCalled();
  });
  it('UTCID07 delete without posts', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue({ blog_category_id: 1, _count: { blog_posts: 0 } });
    expect(await service.deleteCategory(1)).toEqual({ message: 'Đã xóa danh mục thành công' });
    expect(prisma.blog_categories.delete).toHaveBeenCalledWith({ where: { blog_category_id: 1 } });
  });
  it('UTCID08 delete with posts', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue({ blog_category_id: 1, _count: { blog_posts: 1 } });
    await expectErr(service.deleteCategory(1), BadRequestException, 'Không thể xóa danh mục đang có bài viết');
    expect(prisma.blog_categories.delete).not.toHaveBeenCalled();
  });
  it('UTCID09 delete not found', async () => {
    prisma.blog_categories.findUnique.mockResolvedValue(null);
    await expectErr(service.deleteCategory(999), NotFoundException, 'Danh mục không tồn tại');
    expect(prisma.blog_categories.delete).not.toHaveBeenCalled();
  });
});
