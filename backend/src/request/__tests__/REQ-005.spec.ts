import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-005 RequestService.updateRequest', () => {
  let prisma: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const req = (o: any = {}) => ({ request_id: 1, facility_id: 1, status: { status_code: 'PENDING' }, ...o });

  beforeEach(() => {
    prisma = {
      blood_requests: {
        findUnique: jest.fn().mockResolvedValue(req()),
        update: jest.fn().mockResolvedValue({ request_id: 1, updated: true }),
      },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 ADMIN updates facility', async () => {
    const res = await service.updateRequest(1, { units_needed: 3, facility_id: 2 }, admin);
    expect(res).toEqual({ request_id: 1, updated: true });
    const data = prisma.blood_requests.update.mock.calls[0][0].data;
    expect(data.facility_id).toBe(2);
    expect(data.units_needed).toBe(3);
  });

  it('UTCID02 staff cannot change facility', async () => {
    const res = await service.updateRequest(1, { units_needed: 3, facility_id: 2 }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res).toBeDefined();
    expect(prisma.blood_requests.update.mock.calls[0][0].data.facility_id).toBeUndefined();
  });

  it('UTCID03 required_before converted', async () => {
    await service.updateRequest(1, { required_before: '2026-11-10' } as any, admin);
    expect(prisma.blood_requests.update.mock.calls[0][0].data.required_before).toEqual(new Date('2026-11-10'));
  });

  it('UTCID04 not found', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.updateRequest(999, { units_needed: 3 }, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy yêu cầu');
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID05 other facility staff', async () => {
    const p = service.updateRequest(1, { units_needed: 3 }, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền sửa yêu cầu này');
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID06 not pending', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(req({ status: { status_code: 'APPROVED' } }));
    const p = service.updateRequest(1, { units_needed: 3 }, admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Chỉ có thể sửa yêu cầu ở trạng thái pending');
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID07 empty dto', async () => {
    const res = await service.updateRequest(1, {}, admin);
    expect(res).toBeDefined();
    const data = prisma.blood_requests.update.mock.calls[0][0].data;
    expect(Object.values(data).every((v) => v === undefined)).toBe(true);
  });
});
