import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-006 RequestService.deleteRequest', () => {
  let prisma: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const req = (code: string) => ({ request_id: 1, facility_id: 1, status: { status_code: code } });
  const msg = 'Chỉ có thể xóa yêu cầu ở trạng thái pending hoặc đang tìm người hiến';

  beforeEach(() => {
    prisma = {
      blood_requests: {
        findUnique: jest.fn().mockResolvedValue(req('PENDING')),
        delete: jest.fn().mockResolvedValue({ request_id: 1 }),
      },
      blood_request_donor_matches: { deleteMany: jest.fn().mockResolvedValue({}) },
      blood_request_status_history: { deleteMany: jest.fn().mockResolvedValue({}) },
      blood_request_inventory_allocations: { deleteMany: jest.fn().mockResolvedValue({}) },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });
  const noDelete = () => {
    expect(prisma.blood_request_donor_matches.deleteMany).not.toHaveBeenCalled();
    expect(prisma.blood_request_status_history.deleteMany).not.toHaveBeenCalled();
    expect(prisma.blood_request_inventory_allocations.deleteMany).not.toHaveBeenCalled();
  };

  it('UTCID01 delete PENDING', async () => {
    const res = await service.deleteRequest(1, admin);
    expect(res).toEqual({ request_id: 1 });
    expect(prisma.blood_request_donor_matches.deleteMany).toHaveBeenCalledWith({ where: { request_id: 1 } });
    expect(prisma.blood_request_status_history.deleteMany).toHaveBeenCalledWith({ where: { request_id: 1 } });
    expect(prisma.blood_request_inventory_allocations.deleteMany).toHaveBeenCalledWith({ where: { request_id: 1 } });
    expect(prisma.blood_requests.delete).toHaveBeenCalled();
  });

  it('UTCID02 staff deletes matching_donors', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('matching_donors'));
    const res = await service.deleteRequest(1, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res).toBeDefined();
    expect(prisma.blood_requests.delete).toHaveBeenCalled();
  });

  it('UTCID03 not found', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.deleteRequest(999, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy yêu cầu');
    noDelete();
  });

  it('UTCID04 other facility staff', async () => {
    const p = service.deleteRequest(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền xóa yêu cầu này');
    noDelete();
  });

  it('UTCID05 ALLOCATED rejected', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('ALLOCATED'));
    const p = service.deleteRequest(1, admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    noDelete();
  });

  it('UTCID06 APPROVED rejected', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req('APPROVED'));
    await expect(service.deleteRequest(1, admin)).rejects.toThrow(new BadRequestException(msg));
    noDelete();
  });

  it('UTCID07 delete rejects after children removed', async () => {
    const err = new Error('prisma');
    prisma.blood_requests.delete.mockRejectedValue(err);
    await expect(service.deleteRequest(1, admin)).rejects.toBe(err);
    expect(prisma.blood_request_donor_matches.deleteMany).toHaveBeenCalled();
    expect(prisma.blood_request_status_history.deleteMany).toHaveBeenCalled();
    expect(prisma.blood_request_inventory_allocations.deleteMany).toHaveBeenCalled();
  });
});
