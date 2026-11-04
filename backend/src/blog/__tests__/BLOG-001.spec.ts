import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/blog.dto';
import { BlogFilterDto } from '../dto/blog-filter.dto';
import { validate, expectDtoErr } from './_helpers';
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

describe('BLOG-001 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vPost = { title: 'Hiến máu cứu người', slug: 'hien-mau-cuu-nguoi', content: '<p>Nội dung</p>', blog_category_id: 1, is_published: true };
  const vCat = { category_name: 'Tin tức', slug: 'tin-tuc' };
  const vCmt = { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' };

  it('UTCID07 page 0 below @Min(1)', async () => {
    await expectDtoErr(validate(BlogFilterDto, { page: '0' }, 'query'), "page must not be less than 1");
  });
  it('UTCID08 page 1 accepted, transformed to number', async () => {
    const out: any = await validate(BlogFilterDto, { page: '1' }, 'query');
    expect(out.page).toBe(1); expect(out.limit).toBe(20);
  });
  it('UTCID09 limit 0 below @Min(1)', async () => {
    await expectDtoErr(validate(BlogFilterDto, { limit: '0' }, 'query'), "limit must not be less than 1");
  });
  it('UTCID10 limit 1 accepted', async () => {
    const out: any = await validate(BlogFilterDto, { limit: '1' }, 'query');
    expect(out.limit).toBe(1);
  });
  it('UTCID11 page not an integer', async () => {
    await expectDtoErr(validate(BlogFilterDto, { page: 'abc' }, 'query'), "page must be an integer number");
  });
  it('UTCID12 category_id not an integer', async () => {
    await expectDtoErr(validate(BlogFilterDto, { category_id: 'abc' }, 'query'), "category_id must be an integer number");
  });
  it('UTCID13 sortOrder not in enum', async () => {
    await expectDtoErr(validate(BlogFilterDto, { sortOrder: 'up' }, 'query'), "sortOrder must be one of the following values: asc, desc");
  });
});
