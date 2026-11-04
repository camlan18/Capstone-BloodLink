import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-007 RequestService.cancelRequest', () => {
  let prisma: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const req = (code: string, o: any = {}) => ({ request_id: 1, facility_id: 1, status_id: 1, status: { status_code: code }, ...o });
  const msg = 'Chỉ có thể hủy yêu cầu ở trạng thái pending hoặc đang tìm người hiến';

  beforeEach(() => {
    prisma = {
      blood_requests: {
        findUnique: jest.fn().mockResolvedValue(req('PENDING')),
        update: jest.fn().mockResolvedValue({ request_id: 1, status_id: 6 }),
      },
      blood_request_statuses: { findFirst: jest.fn().mockResolvedValue({ status_id: 6 }) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });
  const noWrite = () => {
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
    expect(prisma.blood_request_status_history.create).not.toHaveBeenCalled();
  };

  it('UTCID01 cancel PENDING', async () => {
    const res = await service.cancelRequest(1, admin);
    expect(res.status_id).toBe(6);
    expect(prisma.blood_requests.update).toHaveBeenCalledWith({ where: { request_id: 1 }, data: { status_id: 6 } });
    expect(prisma.blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ from_status_id: 1, to_status_id: 6, change_reason: 'Người dùng hủy yêu cầu' }),
    });
  });

  it('UTCID02 staff cancels matching_donors', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('matching_donors'));
    const res = await service.cancelRequest(1, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res).toBeDefined();
    expect(prisma.blood_request_status_history.create).toHaveBeenCalledWith({ data: expect.objectContaining({ changed_by: 5 }) });
  });

  it('UTCID03 not found', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.cancelRequest(999, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy yêu cầu');
    noWrite();
  });

  it('UTCID04 other facility staff', async () => {
    const p = service.cancelRequest(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền hủy yêu cầu này');
    noWrite();
  });

  it('UTCID05 COMPLETED rejected', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('COMPLETED'));
    const p = service.cancelRequest(1, admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    noWrite();
  });

  it('UTCID06 APPROVED rejected', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('APPROVED'));
    await expect(service.cancelRequest(1, admin)).rejects.toThrow(new BadRequestException(msg));
    noWrite();
  });

  it('UTCID07 cancelled status missing', async () => {
    prisma.blood_request_statuses.findFirst.mockResolvedValue(null);
    const p = service.cancelRequest(1, admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Không tìm thấy trạng thái cancelled trong hệ thống');
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
    expect(prisma.blood_request_statuses.findFirst).toHaveBeenCalledWith({ where: { status_code: 'cancelled' } });
  });
});
