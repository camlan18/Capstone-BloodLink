import { EducationService } from '../education.service';

describe('EDU-005 EducationService.getDocuments', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_documents: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 defaults', async () => {
    prisma.education_documents.findMany.mockResolvedValue([{}, {}, {}]);
    prisma.education_documents.count.mockResolvedValue(3);
    const r = await service.getDocuments({} as any);
    expect(r.data).toHaveLength(3);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.education_documents.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { is_published: true }, skip: 0, take: 20, orderBy: { created_at: 'desc' } }));
  });
  it('UTCID02 page 2 limit 10', async () => {
    prisma.education_documents.count.mockResolvedValue(25);
    const r = await service.getDocuments({ page: 2, limit: 10 } as any);
    expect(r.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(prisma.education_documents.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });
  it('UTCID03 category and blood type filter', async () => {
    prisma.education_documents.findMany.mockResolvedValue([{}]);
    const r = await service.getDocuments({ category_id: 1, blood_type_id: 2 } as any);
    expect(r.data).toHaveLength(1);
    expect(prisma.education_documents.findMany.mock.calls[0][0].where).toEqual({ is_published: true, category_id: 1, blood_type_id: 2 });
  });
  it('UTCID04 search', async () => {
    prisma.education_documents.findMany.mockResolvedValue([{}]);
    await service.getDocuments({ search: 'hiến máu' } as any);
    expect(prisma.education_documents.findMany.mock.calls[0][0].where.OR).toEqual([
      { title: { contains: 'hiến máu' } }, { summary: { contains: 'hiến máu' } }]);
  });
  it('UTCID05 no result', async () => {
    const r = await service.getDocuments({ search: 'xyz' } as any);
    expect(r.data).toEqual([]);
    expect(r.meta.totalPages).toBe(0);
  });
  it('UTCID06 drafts excluded from public list (SRS; defect: no is_published filter)', async () => {
    await service.getDocuments({} as any);
    expect(prisma.education_documents.findMany.mock.calls[0][0].where).toEqual(expect.objectContaining({ is_published: true }));
  });
});
