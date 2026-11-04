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
