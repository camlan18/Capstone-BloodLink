import { BlogService } from '../blog.service';
import { expectErr } from './_helpers';

describe('BLOG-006 BlogService.getCategories', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = { blog_categories: { findMany: jest.fn() } };
    service = new BlogService(prisma as any);
  });
  it('UTCID01 3 categories', async () => {
    prisma.blog_categories.findMany.mockResolvedValue([{}, {}, {}]);
    expect(await service.getCategories()).toHaveLength(3);
    expect(prisma.blog_categories.findMany).toHaveBeenCalledWith({ orderBy: { category_name: 'asc' } });
  });
  it('UTCID02 none', async () => {
    prisma.blog_categories.findMany.mockResolvedValue([]);
    expect(await service.getCategories()).toEqual([]);
  });
  it('UTCID03 one', async () => {
    prisma.blog_categories.findMany.mockResolvedValue([{ blog_category_id: 1 }]);
    expect(await service.getCategories()).toHaveLength(1);
  });
  it('UTCID04 db error', async () => {
    prisma.blog_categories.findMany.mockRejectedValue(new Error('DB down'));
    await expectErr(service.getCategories(), Error, 'DB down');
  });
});
