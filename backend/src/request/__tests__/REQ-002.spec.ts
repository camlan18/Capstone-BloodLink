import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-002 RequestService.processRequest', () => {
  let prisma: any, tx: any, notif: any, emitter: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const req = (o: any = {}) => ({
    request_id: 1, facility_id: 1, blood_type_id: 1, component_id: 1, units_needed: 2, units_fulfilled: 0,
    status_id: 1, status: { status_code: 'PENDING' }, requester_user_id: 9, patient_name: 'A', ...o,
  });
  const bags = (n: number) => Array.from({ length: n }, (_, i) => ({ inventory_id: 10 + i }));

  beforeEach(() => {
    tx = {
      blood_requests: { findUnique: jest.fn().mockResolvedValue(req()), update: jest.fn().mockResolvedValue({}) },
      blood_inventory: { findMany: jest.fn().mockResolvedValue(bags(2)), update: jest.fn().mockResolvedValue({}) },
      blood_request_statuses: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.status_code === 'ALLOCATED' ? { status_id: 3 } : where.status_code === 'APPROVED' ? { status_id: 2 } : null),
      },
      blood_request_inventory_allocations: { create: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    notif = { createNotification: jest.fn().mockResolvedValue({}) };
    emitter = { emit: jest.fn() };
    service = new RequestService(prisma as any, emitter as any, notif as any, {} as any);
  });

  it('UTCID01 enough stock allocates', async () => {
    const res = await service.processRequest(1, admin);
    expect(res).toEqual({ success: true, message: 'Đã cấp đủ máu từ kho.' });
    expect(tx.blood_requests.update).toHaveBeenCalledWith({
      where: { request_id: 1 },
      data: { status_id: 3, assigned_staff_id: 1, units_fulfilled: 2 },
    });
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'RESERVED' } }));
    expect(tx.blood_request_inventory_allocations.create).toHaveBeenCalledTimes(2);
    expect(tx.inventory_transactions.create).toHaveBeenCalledTimes(2);
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ transaction_type: 'RESERVE' }) });
    expect(notif.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ user_ids: [9], notification_type: 'INFO' }),
    );
  });

  it('UTCID02 findMany take = units_needed', async () => {
    tx.blood_inventory.findMany.mockResolvedValue(bags(2));
    const res = await service.processRequest(1, admin);
    expect(res.message).toBe('Đã cấp đủ máu từ kho.');
    expect(tx.blood_inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2, where: expect.objectContaining({ status_code: 'AVAILABLE' }) }),
    );
  });

  it('UTCID03 insufficient stock goes to donor search', async () => {
    tx.blood_inventory.findMany.mockResolvedValue(bags(1));
    const res = await service.processRequest(1, admin);
    expect(res).toEqual({ success: true, message: 'Kho thiếu máu. Đã chuyển sang chế độ tìm kiếm người hiến.' });
    expect(tx.blood_requests.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status_id: 2 }) }));
    expect(emitter.emit).toHaveBeenCalledWith('request.match_donors', expect.objectContaining({ requestId: 1, facilityId: 1 }));
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID04 no bags and no requester', async () => {
    tx.blood_inventory.findMany.mockResolvedValue([]);
    tx.blood_requests.findUnique.mockResolvedValue(req({ requester_user_id: null }));
    const res = await service.processRequest(1, admin);
    expect(res.message).toContain('Kho thiếu máu.');
    expect(emitter.emit).toHaveBeenCalled();
    expect(notif.createNotification).not.toHaveBeenCalled();
  });

  it('UTCID05 staff of same facility', async () => {
    const res = await service.processRequest(1, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.message).toBe('Đã cấp đủ máu từ kho.');
    expect(tx.blood_requests.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assigned_staff_id: 5 }) }));
  });

  it('UTCID06 request not found', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.processRequest(999, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Request not found');
    expect(tx.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID07 status not pending', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ status: { status_code: 'APPROVED' } }));
    const p = service.processRequest(1, admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Chỉ có thể xử lý yêu cầu ở trạng thái pending');
    expect(tx.blood_inventory.findMany).not.toHaveBeenCalled();
  });

  it('UTCID08 lowercase pending accepted', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ status: { status_code: 'pending' } }));
    const res = await service.processRequest(1, admin);
    expect(res.success).toBe(true);
    expect(tx.blood_requests.update).toHaveBeenCalled();
  });

  it('UTCID09 staff of other facility', async () => {
    const p = service.processRequest(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền xử lý yêu cầu của cơ sở khác');
    expect(tx.blood_inventory.findMany).not.toHaveBeenCalled();
  });

  it('UTCID10 ALLOCATED status missing', async () => {
    tx.blood_request_statuses.findFirst.mockResolvedValue(null);
    await expect(service.processRequest(1, admin)).rejects.toBeInstanceOf(TypeError);
    expect(tx.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID11 units_fulfilled updated on allocation', async () => {
    const res = await service.processRequest(1, admin);
    expect(res.success).toBe(true);
    expect(tx.blood_requests.update.mock.calls[0][0].data).toEqual(expect.objectContaining({ units_fulfilled: 2 }));
  });
});
