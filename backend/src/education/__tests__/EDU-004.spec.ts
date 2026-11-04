import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EducationService } from '../education.service';
import { expectErr } from './_helpers';

describe('EDU-004 EducationService.deleteCategory', () => {
  let prisma: any; let service: EducationService;
  beforeEach(() => {
    prisma = { education_document_categories: { findUnique: jest.fn(), delete: jest.fn().mockResolvedValue({}) } };
    service = new EducationService(prisma as any);
  });
  it('UTCID01 empty category deleted', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1, _count: { education_documents: 0 } });
    expect(await service.deleteCategory(1)).toEqual({ message: 'Đã xóa danh mục thành công' });
    expect(prisma.education_document_categories.delete).toHaveBeenCalledWith({ where: { category_id: 1 } });
  });
  it('UTCID02 category has documents', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1, _count: { education_documents: 1 } });
    await expectErr(service.deleteCategory(1), BadRequestException, 'Không thể xóa danh mục đang có tài liệu');
    expect(prisma.education_document_categories.delete).not.toHaveBeenCalled();
  });
  it('UTCID03 not found', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue(null);
    await expectErr(service.deleteCategory(999), NotFoundException, 'Danh mục không tồn tại');
    expect(prisma.education_document_categories.delete).not.toHaveBeenCalled();
  });
  it('UTCID04 delete rejects', async () => {
    prisma.education_document_categories.findUnique.mockResolvedValue({ category_id: 1, _count: { education_documents: 0 } });
    prisma.education_document_categories.delete.mockRejectedValue(new Error('DB'));
    await expectErr(service.deleteCategory(1), Error, 'DB');
    expect(prisma.education_document_categories.delete).toHaveBeenCalledTimes(1);
  });
});
