import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';

describe('INV-003 InventoryService.discardBlood', () => {
  let prisma: any, tx: any, service: InventoryService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const bag = (status: string) => ({ inventory_id: 10, facility_id: 1, status_code: status });

  beforeEach(() => {
    tx = {
      blood_inventory: {
        findUnique: jest.fn().mockResolvedValue(bag('AVAILABLE')),
        update: jest.fn().mockResolvedValue({ inventory_id: 10, status_code: 'DISCARDED' }),
      },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 discard AVAILABLE bag', async () => {
    const res = await service.discardBlood(10, admin, 'Vỡ túi');
    expect(res.status_code).toBe('DISCARDED');
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'DISCARDED' } }));
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'OUT', reference_type: 'DISCARD', notes: 'Vỡ túi' }),
    });
  });

  it('UTCID02 staff discards EXPIRED bag', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(bag('EXPIRED'));
    const res = await service.discardBlood(10, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 }, 'Hết hạn');
    expect(res.status_code).toBe('DISCARDED');
    expect(tx.blood_inventory.update).toHaveBeenCalled();
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ performed_by: 5 }) });
  });

  it('UTCID03 bag not found', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(null);
    const p = service.discardBlood(999, admin, 'Vỡ túi');
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy túi máu');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.inventory_transactions.create).not.toHaveBeenCalled();
  });

  it('UTCID04 staff other facility', async () => {
    const p = service.discardBlood(10, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 }, 'Vỡ túi');
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền tiêu hủy túi máu của cơ sở khác');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID05 RESERVED bag rejected', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(bag('RESERVED'));
    const p = service.discardBlood(10, admin, 'Vỡ túi');
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu đang ở trạng thái RESERVED, không thể tiêu hủy.');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID06 DISCARDED bag rejected', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(bag('DISCARDED'));
    await expect(service.discardBlood(10, admin, 'Vỡ túi')).rejects.toThrow(
      new BadRequestException('Túi máu đang ở trạng thái DISCARDED, không thể tiêu hủy.'),
    );
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID07 no reason', async () => {
    const res = await service.discardBlood(10, admin, undefined as any);
    expect(res.status_code).toBe('DISCARDED');
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ notes: undefined }) });
  });
});
