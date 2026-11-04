import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-001 EducationService.getCategories', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_document_categories: { findMany: jest.fn() } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 3 categories', async () => {
    prisma.education_document_categories.findMany.mockResolvedValue([{}, {}, {}]);
    expect(await service.getCategories()).toHaveLength(3);
    expect(prisma.education_document_categories.findMany).toHaveBeenCalledWith({ orderBy: { sort_order: 'asc' } });
  });
  it('UTCID02 none', async () => {
    prisma.education_document_categories.findMany.mockResolvedValue([]);
    expect(await service.getCategories()).toEqual([]);
  });
  it('UTCID03 one', async () => {
    prisma.education_document_categories.findMany.mockResolvedValue([{}]);
    expect(await service.getCategories()).toHaveLength(1);
  });
  it('UTCID04 db error', async () => {
    prisma.education_document_categories.findMany.mockRejectedValue(new Error('DB'));
    await expectErr(service.getCategories(), Error, 'DB');
  });
});
