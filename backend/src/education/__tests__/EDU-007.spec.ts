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
