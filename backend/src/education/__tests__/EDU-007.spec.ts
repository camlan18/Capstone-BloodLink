import { CreateEducationCategoryDto, UpdateEducationCategoryDto, CreateEducationDocumentDto, UpdateEducationDocumentDto, EducationFilterDto } from '../dto/education.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-007 EducationService.createDocument', () => {
  let prisma: any; let service: EducationService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const dto = (o: any = {}) => ({ category_id: 1, title: 'T', slug: 'loi-ich-hien-mau', content_html: '<p/>', ...o });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { education_documents: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ document_id: 1 }) } };
    service = new EducationService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());
  it('UTCID01 published', async () => {
    expect(await service.createDocument(1, dto({ is_published: true }) as any)).toEqual({ document_id: 1 });
    expect(prisma.education_documents.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      created_by: 1, is_published: true, published_at: NOW }) });
  });
  it('UTCID02 default published', async () => {
    await service.createDocument(1, dto() as any);
    expect(prisma.education_documents.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_published: true, published_at: NOW }) });
  });
  it('UTCID03 draft', async () => {
    await service.createDocument(1, dto({ is_published: false }) as any);
    expect(prisma.education_documents.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_published: false, published_at: null }) });
  });
  it('UTCID04 duplicate slug', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 9 });
    await expectErr(service.createDocument(1, dto({ slug: 'slug-trung', is_published: true }) as any), BadRequestException, 'Slug đã tồn tại');
    expect(prisma.education_documents.create).not.toHaveBeenCalled();
  });
});

describe('EDU-007 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vCat = { category_name: 'Kiến thức hiến máu', sort_order: 2 };
  const vDoc = { title: 'Lợi ích hiến máu', slug: 'loi-ich-hien-mau', content_html: '<p>Nội dung</p>', category_id: 1, is_published: true };

  it('UTCID05 empty title', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, title: '' }, 'body'), "Tiêu đề không được để trống");
  });
  it('UTCID06 empty slug', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, slug: '' }, 'body'), "Slug không được để trống");
  });
  it('UTCID07 empty content_html', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, content_html: '' }, 'body'), "Nội dung không được để trống");
  });
  it('UTCID08 summary not a string', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, summary: 123 }, 'body'), "summary must be a string");
  });
  it('UTCID09 thumbnail_url not a string', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, thumbnail_url: 123 }, 'body'), "thumbnail_url must be a string");
  });
  it('UTCID10 missing category_id', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, category_id: undefined }, 'body'), "category_id must be an integer number");
  });
  it('UTCID11 numeric string category_id transformed', async () => {
    const out: any = await validate(CreateEducationDocumentDto, { ...vDoc, category_id: '3' }, 'body');
    expect(out.category_id).toBe(3);
  });
  it('UTCID12 blood_type_id not numeric', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, blood_type_id: 'abc' }, 'body'), "blood_type_id must be an integer number");
  });
  it('UTCID13 is_published sent as string', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, is_published: 'true' }, 'body'), "is_published must be a boolean value");
  });
  it('UTCID14 unknown property stripped (whitelist)', async () => {
    const out: any = await validate(CreateEducationDocumentDto, { ...vDoc, view_count: 1000, created_by: 99 }, 'body');
    expect(out).not.toHaveProperty('view_count'); expect(out).not.toHaveProperty('created_by'); expect(out.slug).toBe(vDoc.slug);
  });
  it('UTCID15 title longer than NVarChar(300)', async () => {
    await expectDtoErr(validate(CreateEducationDocumentDto, { ...vDoc, title: 'a'.repeat(301) }, 'body'), "title must be shorter than or equal to 300 characters");
  });
});
