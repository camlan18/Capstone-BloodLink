import { CreatePostDto, UpdatePostDto, AddCommentDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/blog.dto';
import { BlogFilterDto } from '../dto/blog-filter.dto';
import { validate, expectDtoErr } from './_helpers';
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

describe('BLOG-003 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vPost = { title: 'Hiến máu cứu người', slug: 'hien-mau-cuu-nguoi', content: '<p>Nội dung</p>', blog_category_id: 1, is_published: true };
  const vCat = { category_name: 'Tin tức', slug: 'tin-tuc' };
  const vCmt = { content: 'Bài viết rất hữu ích!', guest_name: 'Khách' };

  it('UTCID06 empty title', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, title: '' }, 'body'), "Tiêu đề không được để trống");
  });
  it('UTCID07 title not a string', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, title: 123 }, 'body'), "title must be a string");
  });
  it('UTCID08 empty slug', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, slug: '' }, 'body'), "Slug không được để trống");
  });
  it('UTCID09 empty content', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, content: '' }, 'body'), "Nội dung không được để trống");
  });
  it('UTCID10 summary not a string', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, summary: 123 }, 'body'), "summary must be a string");
  });
  it('UTCID11 thumbnail_url not a string', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, thumbnail_url: 123 }, 'body'), "thumbnail_url must be a string");
  });
  it('UTCID12 missing blog_category_id', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, blog_category_id: undefined }, 'body'), "blog_category_id must be an integer number");
  });
  it('UTCID13 blog_category_id not numeric', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, blog_category_id: 'abc' }, 'body'), "blog_category_id must be an integer number");
  });
  it('UTCID14 numeric string blog_category_id transformed', async () => {
    const out: any = await validate(CreatePostDto, { ...vPost, blog_category_id: '5' }, 'body');
    expect(out.blog_category_id).toBe(5);
  });
  it('UTCID15 is_published not boolean', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, is_published: 'yes' }, 'body'), "is_published must be a boolean value");
  });
  it('UTCID16 unknown property stripped (whitelist)', async () => {
    const out: any = await validate(CreatePostDto, { ...vPost, author_user_id: 99, view_count: 1000 }, 'body');
    expect(out).not.toHaveProperty('author_user_id'); expect(out).not.toHaveProperty('view_count'); expect(out.title).toBe(vPost.title);
  });
  it('UTCID17 title longer than DB column NVarChar(300)', async () => {
    await expectDtoErr(validate(CreatePostDto, { ...vPost, title: 'a'.repeat(301) }, 'body'), "title must be shorter than or equal to 300 characters");
  });
});
