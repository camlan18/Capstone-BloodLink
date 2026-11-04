import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-010 RequestService.releaseAllocation', () => {
  let prisma: any, tx: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const alloc = (o: any = {}) => ({ allocation_id: 50, inventory_id: 10, request_id: 1, is_active: true, request: { facility_id: 1 }, ...o });
  const req = (o: any = {}) => ({ request_id: 1, units_needed: 3, units_fulfilled: 2, status_id: 3, ...o });
  const statuses: any = { completed: { status_id: 5 }, allocated_stock: { status_id: 3 }, matching_donors: { status_id: 2 } };
  let statusMap: any;
  const reqUpd = () => tx.blood_requests.update.mock.calls[0][0].data;
  const noWrite = () => {
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.blood_request_inventory_allocations.update).not.toHaveBeenCalled();
    expect(tx.inventory_transactions.create).not.toHaveBeenCalled();
  };
  const OK = { message: 'Đã giải phóng phân bổ máu thành công' };

  beforeEach(() => {
    statusMap = { ...statuses };
    tx = {
      blood_request_inventory_allocations: {
        findUnique: jest.fn().mockResolvedValue(alloc()),
        update: jest.fn().mockResolvedValue({}),
      },
      blood_inventory: { update: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
      blood_requests: { findUnique: jest.fn().mockResolvedValue(req()), update: jest.fn().mockResolvedValue({}) },
      blood_request_statuses: { findFirst: jest.fn(async ({ where }: any) => statusMap[where.status_code] ?? null) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 partial release keeps status', async () => {
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith({ where: { inventory_id: 10 }, data: { status_code: 'AVAILABLE' } });
    expect(tx.blood_request_inventory_allocations.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_active: false, released_at: expect.any(Date) } }),
    );
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'RELEASE', reference_type: 'ALLOCATION', reference_id: 50 }),
    });
    expect(reqUpd()).toEqual({ units_fulfilled: 1 });
  });

  it('UTCID02 completed reverts to ALLOCATED', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2, units_fulfilled: 2, status_id: 5 }));
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(reqUpd()).toEqual({ units_fulfilled: 1, status_id: 3 });
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ change_reason: 'Thu hồi máu, chuyển trạng thái về ALLOCATED' }),
    });
  });

  it('UTCID03 fulfilled reaches 0', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2, units_fulfilled: 1, status_id: 3 }));
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(reqUpd()).toEqual({ units_fulfilled: 0, status_id: 2 });
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ change_reason: 'Thu hồi máu, chuyển trạng thái về APPROVED' }),
    });
  });

  it('UTCID04 over-fulfilled stays complete', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2, units_fulfilled: 3, status_id: 5 }));
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(reqUpd()).toEqual({ units_fulfilled: 2 });
    expect(tx.blood_request_status_history.create).not.toHaveBeenCalled();
  });

  it('UTCID05 request with fulfilled 0', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_fulfilled: 0 }));
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'AVAILABLE' } }));
    expect(tx.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID06 matching_donors status missing', async () => {
    delete statusMap.matching_donors;
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2, units_fulfilled: 1, status_id: 3 }));
    const res = await service.releaseAllocation(50, admin);
    expect(res).toEqual(OK);
    expect(reqUpd()).toEqual({ units_fulfilled: 0 });
  });

  it('UTCID07 staff same facility', async () => {
    const res = await service.releaseAllocation(50, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res).toEqual(OK);
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ performed_by: 5 }) });
  });

  it('UTCID08 allocation not found', async () => {
    tx.blood_request_inventory_allocations.findUnique.mockResolvedValue(null);
    const p = service.releaseAllocation(999, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Phân bổ không tồn tại hoặc đã được giải phóng');
    noWrite();
  });

  it('UTCID09 allocation inactive', async () => {
    tx.blood_request_inventory_allocations.findUnique.mockResolvedValue(alloc({ is_active: false }));
    await expect(service.releaseAllocation(50, admin)).rejects.toThrow(
      new NotFoundException('Phân bổ không tồn tại hoặc đã được giải phóng'),
    );
    noWrite();
  });

  it('UTCID10 other facility staff', async () => {
    const p = service.releaseAllocation(50, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền giải phóng phân bổ này');
    noWrite();
  });
});
