import { NotFoundException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr, errOf } from './_helpers';

describe('EDU-006 EducationService.getDocumentBySlug', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_documents: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 found and view incremented', async () => {
    const doc = { document_id: 1, is_published: true };
    prisma.education_documents.findUnique.mockResolvedValue(doc);
    expect(await service.getDocumentBySlug('loi-ich-hien-mau')).toBe(doc);
    expect(prisma.education_documents.update).toHaveBeenCalledWith({
      where: { document_id: 1 }, data: { view_count: { increment: 1 } } });
  });
  it('UTCID02 not found', async () => {
    prisma.education_documents.findUnique.mockResolvedValue(null);
    await expectErr(service.getDocumentBySlug('khong-ton-tai'), NotFoundException, 'Tài liệu không tồn tại');
    expect(prisma.education_documents.update).not.toHaveBeenCalled();
  });
  it('UTCID03 draft hidden (SRS; defect: code returns drafts)', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 2, is_published: false });
    await expectErr(service.getDocumentBySlug('tai-lieu-nhap'), NotFoundException, 'Tài liệu không tồn tại');
    expect(prisma.education_documents.update).not.toHaveBeenCalled();
  });
  it('UTCID04 update rejects (awaited)', async () => {
    const err = new Error('DB');
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 1, is_published: true });
    prisma.education_documents.update.mockRejectedValue(err);
    expect(await errOf(service.getDocumentBySlug('loi-ich-hien-mau'))).toBe(err);
    expect(prisma.education_documents.update).toHaveBeenCalledTimes(1);
  });
});
