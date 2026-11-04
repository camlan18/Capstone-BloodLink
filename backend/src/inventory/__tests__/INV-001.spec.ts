import { BadRequestException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';

describe('INV-001 InventoryService.receiveBlood', () => {
  let prisma: any, tx: any, service: InventoryService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const dto = () => ({ bag_code: 'BAG-001', facility_id: 1, blood_type_id: 1, component_id: 1 });

  beforeEach(() => {
    tx = {
      blood_inventory: { create: jest.fn().mockResolvedValue({ inventory_id: 10, status_code: 'AVAILABLE' }) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      blood_inventory: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 ADMIN receives new bag', async () => {
    const res = await service.receiveBlood(dto(), admin);
    expect(res).toEqual({ inventory_id: 10, status_code: 'AVAILABLE' });
    expect(tx.blood_inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ facility_id: 1, status_code: 'AVAILABLE' }),
    });
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'IN', reference_type: 'DONATION' }),
    });
  });

  it('UTCID02 HOSPITAL_STAFF uses own facility', async () => {
    await service.receiveBlood({ ...dto(), facility_id: 3 }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(tx.blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID03 missing facility_id', async () => {
    await expect(service.receiveBlood({ bag_code: 'BAG-001' }, admin)).rejects.toThrow(
      new BadRequestException('Cơ sở y tế không được để trống'),
    );
    expect(prisma.blood_inventory.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID04 staff without facility', async () => {
    await expect(
      service.receiveBlood(dto(), { user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null }),
    ).rejects.toThrow(new BadRequestException('Cơ sở y tế không được để trống'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID05 duplicate bag_code', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ inventory_id: 99 });
    const p = service.receiveBlood(dto(), admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Mã túi máu (bag_code) đã tồn tại trong hệ thống.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID06 transaction create rejects', async () => {
    const err = new Error('prisma fail');
    tx.inventory_transactions.create.mockRejectedValue(err);
    await expect(service.receiveBlood(dto(), admin)).rejects.toBe(err);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.blood_inventory.create).toHaveBeenCalled();
  });
});
