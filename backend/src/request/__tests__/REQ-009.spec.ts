import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { RequestService } from '../request.service';
import { AllocateInventoryDto } from '../dto/matching-allocation.dto';

describe('REQ-009 RequestService.allocateInventory', () => {
  let prisma: any, tx: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const req = (o: any = {}) => ({
    request_id: 1, request_code: 'RQ-1', facility_id: 1, units_needed: 2, units_fulfilled: 0, status_id: 2, ...o,
  });
  const bagList = (ids: number[]) => ids.map((i) => ({ inventory_id: i }));
  const statuses: any = { completed: { status_id: 5 }, allocated_stock: { status_id: 3 } };
  const updData = () => tx.blood_requests.update.mock.calls[0][0].data;
  const noWrite = () => {
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.blood_requests.update).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    tx = {
      blood_requests: { findUnique: jest.fn().mockResolvedValue(req()), update: jest.fn().mockResolvedValue({}) },
      blood_inventory: { findMany: jest.fn().mockResolvedValue(bagList([10, 11])), update: jest.fn().mockResolvedValue({}) },
      blood_request_inventory_allocations: { create: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
      blood_request_statuses: { findFirst: jest.fn(async ({ where }: any) => statuses[where.status_code] ?? null) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 fully allocated', async () => {
    const res = await service.allocateInventory(1, [10, 11], admin);
    expect(res).toEqual({ message: 'Đã cấp phát thành công 2 đơn vị máu' });
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'RESERVED' } }));
    expect(tx.blood_request_inventory_allocations.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_active: true }) });
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ transaction_type: 'RESERVE' }) });
    expect(updData()).toEqual(expect.objectContaining({ units_fulfilled: 2, status_id: 5, completed_at: expect.any(Date) }));
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({ data: expect.objectContaining({ change_reason: 'Đã cấp phát đủ máu' }) });
  });

  it('UTCID02 partially allocated', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 3 }));
    tx.blood_inventory.findMany.mockResolvedValue(bagList([10]));
    const res = await service.allocateInventory(1, [10], admin);
    expect(res.message).toBe('Đã cấp phát thành công 1 đơn vị máu');
    expect(updData()).toEqual({ units_fulfilled: 1, status_id: 3 });
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({ data: expect.objectContaining({ change_reason: 'Đã cấp phát một phần máu' }) });
  });

  it('UTCID03 already allocated_stock', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 3, units_fulfilled: 1, status_id: 3 }));
    tx.blood_inventory.findMany.mockResolvedValue(bagList([11]));
    const res = await service.allocateInventory(1, [11], admin);
    expect(res.message).toBe('Đã cấp phát thành công 1 đơn vị máu');
    expect(updData()).toEqual({ units_fulfilled: 2 });
    expect(tx.blood_request_status_history.create).not.toHaveBeenCalled();
  });

  it('UTCID04 exactly fulfilled', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_needed: 3, units_fulfilled: 2 }));
    tx.blood_inventory.findMany.mockResolvedValue(bagList([12]));
    const res = await service.allocateInventory(1, [12], admin);
    expect(res.message).toBe('Đã cấp phát thành công 1 đơn vị máu');
    expect(updData()).toEqual(expect.objectContaining({ units_fulfilled: 3, status_id: 5 }));
  });

  it('UTCID05 completed status missing', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ units_fulfilled: 1 }));
    tx.blood_inventory.findMany.mockResolvedValue(bagList([10]));
    tx.blood_request_statuses.findFirst.mockResolvedValue(null);
    const res = await service.allocateInventory(1, [10], admin);
    expect(res.message).toContain('1 đơn vị');
    expect(updData()).toEqual({ units_fulfilled: 2 });
    expect(tx.blood_request_status_history.create).not.toHaveBeenCalled();
  });

  it('UTCID06 staff same facility', async () => {
    tx.blood_inventory.findMany.mockResolvedValue(bagList([10]));
    const res = await service.allocateInventory(1, [10], { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.message).toContain('Đã cấp phát thành công');
    expect(tx.blood_request_inventory_allocations.create).toHaveBeenCalledWith({ data: expect.objectContaining({ allocated_by: 5 }) });
  });

  it('UTCID07 request not found', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.allocateInventory(999, [10], admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Yêu cầu không tồn tại');
    noWrite();
  });

  it('UTCID08 other facility staff', async () => {
    const p = service.allocateInventory(1, [10], { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền cấp phát cho yêu cầu này');
    noWrite();
  });

  it('UTCID09 bag not available', async () => {
    tx.blood_inventory.findMany.mockResolvedValue(bagList([10]));
    const p = service.allocateInventory(1, [10, 11], admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Một hoặc nhiều túi máu không hợp lệ hoặc không có sẵn');
    noWrite();
  });

  it('UTCID10 cancelled request must be rejected', async () => {
    tx.blood_requests.findUnique.mockResolvedValue(req({ status: { status_code: 'CANCELLED' } }));
    tx.blood_inventory.findMany.mockResolvedValue(bagList([10]));
    await expect(service.allocateInventory(1, [10], admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID11 empty list accepted', async () => {
    tx.blood_inventory.findMany.mockResolvedValue([]);
    const res = await service.allocateInventory(1, [], admin);
    expect(res.message).toBe('Đã cấp phát thành công 0 đơn vị máu');
    expect(updData()).toEqual(expect.objectContaining({ units_fulfilled: 0, status_id: 3 }));
  });

  it('UTCID12 no facility/blood-type check on bags', async () => {
    tx.blood_inventory.findMany.mockResolvedValue(bagList([20]));
    const res = await service.allocateInventory(1, [20], admin);
    expect(res.message).toContain('Đã cấp phát thành công');
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'RESERVED' } }));
  });

  // ---- DTO validation: ValidationPipe({ whitelist: true, transform: true }) as in src/main.ts ----
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) => pipe.transform(body, { type: 'body', metatype: AllocateInventoryDto, data: '' });
  const valid = (): any => ({ inventory_ids: [10, 11] });
  const omit = (k: string) => { const b = valid(); delete b[k]; return b; };

  it('UTCID13 DTO inventory_ids missing', async () => {
    const body: any = omit('inventory_ids');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("inventory_ids must be an array");
  });

  it('UTCID14 DTO inventory_ids not an array', async () => {
    const body: any = { ...valid(), inventory_ids: 10 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("inventory_ids must be an array");
  });

  it('UTCID15 DTO inventory_ids element not integer', async () => {
    const body: any = { ...valid(), inventory_ids: [10, 1.5] };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("each value in inventory_ids must be an integer number");
  });

  it('UTCID16 DTO inventory_ids empty array', async () => {
    const body: any = { ...valid(), inventory_ids: [] };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("inventory_ids should not be empty");
  });

  it('UTCID17 DTO inventory_ids one element (min size)', async () => {
    await expect(run({ ...valid(), inventory_ids: [10] })).resolves.toEqual(expect.objectContaining({ inventory_ids: [10] }));
  });
});
