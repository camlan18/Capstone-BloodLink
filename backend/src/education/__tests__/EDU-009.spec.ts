import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-009 EducationService.updateDocument', () => {
  let prisma: any; let service: EducationService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const D0 = new Date('2026-10-01T00:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { education_documents: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ document_id: 1 }) } };
    service = new EducationService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());
  it('UTCID01 same slug, draft -> published', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 1, slug: 'a', is_published: false, published_at: null });
    expect(await service.updateDocument(1, { slug: 'a', is_published: true } as any)).toEqual({ document_id: 1 });
    expect(prisma.education_documents.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.education_documents.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ published_at: NOW, updated_at: NOW }));
  });
  it('UTCID02 already published keeps published_at', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 1, slug: 'a', is_published: true, published_at: D0 });
    await service.updateDocument(1, { is_published: true } as any);
    expect(prisma.education_documents.update.mock.calls[0][0].data.published_at).toBe(D0);
  });
  it('UTCID03 new slug available', async () => {
    prisma.education_documents.findUnique.mockResolvedValueOnce({ document_id: 1, slug: 'a' }).mockResolvedValueOnce(null);
    expect(await service.updateDocument(1, { slug: 'b' } as any)).toEqual({ document_id: 1 });
    expect(prisma.education_documents.findUnique).toHaveBeenLastCalledWith({ where: { slug: 'b' } });
    expect(prisma.education_documents.update).toHaveBeenCalled();
  });
  it('UTCID04 new slug used by other doc', async () => {
    prisma.education_documents.findUnique.mockResolvedValueOnce({ document_id: 1, slug: 'a' }).mockResolvedValueOnce({ document_id: 2 });
    await expectErr(service.updateDocument(1, { slug: 'b' } as any), BadRequestException, 'Slug đã tồn tại');
    expect(prisma.education_documents.update).not.toHaveBeenCalled();
  });
  it('UTCID05 not found', async () => {
    prisma.education_documents.findUnique.mockResolvedValue(null);
    await expectErr(service.updateDocument(999, { slug: 'b' } as any), NotFoundException, 'Tài liệu không tồn tại');
    expect(prisma.education_documents.update).not.toHaveBeenCalled();
  });
});
