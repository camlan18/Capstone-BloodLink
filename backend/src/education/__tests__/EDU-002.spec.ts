import { CreateEducationCategoryDto, UpdateEducationCategoryDto, CreateEducationDocumentDto, UpdateEducationDocumentDto, EducationFilterDto } from '../dto/education.dto';
import { validate, expectDtoErr } from './_helpers';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-002 EducationService.createCategory', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_document_categories: { create: jest.fn().mockResolvedValue({ category_id: 1 }) } };
    service = new EducationService(prisma as any);
  });
  const name = 'Kiến thức hiến máu';
  it('UTCID01 sort_order 2', async () => {
    expect(await service.createCategory({ category_name: name, sort_order: 2 } as any)).toEqual({ category_id: 1 });
    expect(prisma.education_document_categories.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sort_order: 2 }) });
  });
  it('UTCID02 sort_order undefined', async () => {
    await service.createCategory({ category_name: name } as any);
    expect(prisma.education_document_categories.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sort_order: 0 }) });
  });
  it('UTCID03 sort_order 0', async () => {
    await service.createCategory({ category_name: name, sort_order: 0 } as any);
    expect(prisma.education_document_categories.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sort_order: 0 }) });
  });
  it('UTCID04 create rejects', async () => {
    prisma.education_document_categories.create.mockRejectedValue(new Error('DB'));
    await expectErr(service.createCategory({ category_name: name, sort_order: 2 } as any), Error, 'DB');
  });
});

describe('EDU-002 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vCat = { category_name: 'Kiến thức hiến máu', sort_order: 2 };
  const vDoc = { title: 'Lợi ích hiến máu', slug: 'loi-ich-hien-mau', content_html: '<p>Nội dung</p>', category_id: 1, is_published: true };

  it('UTCID05 empty category_name', async () => {
    await expectDtoErr(validate(CreateEducationCategoryDto, { ...vCat, category_name: '' }, 'body'), "Tên danh mục không được để trống");
  });
  it('UTCID06 category_name not a string', async () => {
    await expectDtoErr(validate(CreateEducationCategoryDto, { ...vCat, category_name: 123 }, 'body'), "category_name must be a string");
  });
  it('UTCID07 description not a string', async () => {
    await expectDtoErr(validate(CreateEducationCategoryDto, { ...vCat, description: 123 }, 'body'), "description must be a string");
  });
  it('UTCID08 sort_order not an integer', async () => {
    await expectDtoErr(validate(CreateEducationCategoryDto, { ...vCat, sort_order: 1.5 }, 'body'), "sort_order must be an integer number");
  });
  it('UTCID09 numeric string sort_order transformed', async () => {
    const out: any = await validate(CreateEducationCategoryDto, { ...vCat, sort_order: '2' }, 'body');
    expect(out.sort_order).toBe(2);
  });
  it('UTCID10 category_name longer than NVarChar(150)', async () => {
    await expectDtoErr(validate(CreateEducationCategoryDto, { ...vCat, category_name: 'a'.repeat(151) }, 'body'), "category_name must be shorter than or equal to 150 characters");
  });
});
