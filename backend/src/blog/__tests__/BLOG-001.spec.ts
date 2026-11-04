import { BlogService } from '../blog.service';

describe('BLOG-001 BlogService.getAllPosts', () => {
  let prisma: any; let service: BlogService;
  beforeEach(() => {
    prisma = { blog_posts: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    service = new BlogService(prisma as any);
  });

  it('UTCID01 defaults: page 1, limit 20, published only', async () => {
    prisma.blog_posts.findMany.mockResolvedValue([{}, {}, {}]);
    prisma.blog_posts.count.mockResolvedValue(3);
    const r = await service.getAllPosts({} as any);
    expect(r.data).toHaveLength(3);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blog_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { is_published: true }, skip: 0, take: 20, orderBy: { published_at: 'desc' } }));
  });
  it('UTCID02 page 2 limit 20', async () => {
    prisma.blog_posts.count.mockResolvedValue(45);
    const r = await service.getAllPosts({ page: 2, limit: 20 } as any);
    expect(r.meta).toEqual({ total: 45, page: 2, limit: 20, totalPages: 3 });
    expect(prisma.blog_posts.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
  });
  it('UTCID03 filter by category', async () => {
    prisma.blog_posts.findMany.mockResolvedValue([{ blog_category_id: 1 }]);
    const r = await service.getAllPosts({ category_id: 1 } as any);
    expect(r.data).toEqual([{ blog_category_id: 1 }]);
    expect(prisma.blog_posts.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({ blog_category_id: 1 }));
  });
  it('UTCID04 search keyword', async () => {
    prisma.blog_posts.findMany.mockResolvedValue([{ title: 'hiến máu' }]);
    const r = await service.getAllPosts({ search: 'hiến máu' } as any);
    expect(r.data).toHaveLength(1);
    expect(prisma.blog_posts.findMany.mock.calls[0][0].where.OR).toEqual([
      { title: { contains: 'hiến máu' } }, { summary: { contains: 'hiến máu' } }]);
  });
  it('UTCID05 sortBy view_count default desc', async () => {
    prisma.blog_posts.findMany.mockResolvedValue([{}]);
    const r = await service.getAllPosts({ sortBy: 'view_count' } as any);
    expect(r.data).toHaveLength(1);
    expect(prisma.blog_posts.findMany.mock.calls[0][0].orderBy).toEqual({ view_count: 'desc' });
  });
  it('UTCID06 no result', async () => {
    const r = await service.getAllPosts({ search: 'xyz' } as any);
    expect(r).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });
});
