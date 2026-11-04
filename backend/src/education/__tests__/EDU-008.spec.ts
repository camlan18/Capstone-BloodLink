import { NotFoundException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-008 EducationService.deleteDocument', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_documents: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 delete', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 1 });
    expect(await service.deleteDocument(1)).toEqual({ message: 'Đã xóa tài liệu' });
    expect(prisma.education_documents.delete).toHaveBeenCalledWith({ where: { document_id: 1 } });
  });
  it('UTCID02 not found 999', async () => {
    prisma.education_documents.findUnique.mockResolvedValue(null);
    await expectErr(service.deleteDocument(999), NotFoundException, 'Tài liệu không tồn tại');
    expect(prisma.education_documents.delete).not.toHaveBeenCalled();
  });
  it('UTCID03 not found 0', async () => {
    prisma.education_documents.findUnique.mockResolvedValue(null);
    await expectErr(service.deleteDocument(0), NotFoundException, 'Tài liệu không tồn tại');
    expect(prisma.education_documents.delete).not.toHaveBeenCalled();
  });
  it('UTCID04 delete rejects', async () => {
    prisma.education_documents.findUnique.mockResolvedValue({ document_id: 1 });
    prisma.education_documents.delete.mockRejectedValue(new Error('DB'));
    await expectErr(service.deleteDocument(1), Error, 'DB');
    expect(prisma.education_documents.delete).toHaveBeenCalledTimes(1);
  });
});
