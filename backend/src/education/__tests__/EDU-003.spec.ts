import { NotFoundException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-003 EducationService.updateCategory', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_document_categories: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ category_id: 1 }) } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 update', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1 });
    expect(await service.updateCategory(1, { category_name: 'Tên mới', sort_order: 3 } as any)).toEqual({ category_id: 1 });
    expect(prisma.education_document_categories.update).toHaveBeenCalledWith({
      where: { category_id: 1 }, data: expect.objectContaining({ category_name: 'Tên mới', sort_order: 3 }) });
  });
  it('UTCID02 undefined fields', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1 });
    expect(await service.updateCategory(1, {} as any)).toEqual({ category_id: 1 });
    const data = prisma.education_document_categories.update.mock.calls[0][0].data;
    expect(data.category_name).toBeUndefined();
    expect(data.sort_order).toBeUndefined();
  });
  it('UTCID03 sort_order 0 not defaulted', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1 });
    await service.updateCategory(1, { category_name: 'Tên mới', sort_order: 0 } as any);
    expect(prisma.education_document_categories.update.mock.calls[0][0].data.sort_order).toBe(0);
  });
  it('UTCID04 not found', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue(null);
    await expectErr(service.updateCategory(999, { category_name: 'x', sort_order: 3 } as any), NotFoundException, 'Danh mục không tồn tại');
    expect(prisma.education_document_categories.update).not.toHaveBeenCalled();
  });
});
