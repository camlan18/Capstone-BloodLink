import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';

describe('INV-002 InventoryService.updateBlood', () => {
  let prisma: any, service: InventoryService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const bag = { inventory_id: 10, facility_id: 1, status_code: 'AVAILABLE' };

  beforeEach(() => {
    prisma = {
      blood_inventory: {
        findUnique: jest.fn().mockResolvedValue(bag),
        update: jest.fn().mockResolvedValue({ inventory_id: 10, updated: true }),
      },
    };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 ADMIN updates incl. facility', async () => {
    const res = await service.updateBlood(10, { volume_ml: 350, facility_id: 2 }, admin);
    expect(res).toEqual({ inventory_id: 10, updated: true });
    const arg = prisma.blood_inventory.update.mock.calls[0][0];
    expect(arg.data.facility_id).toBe(2);
    expect(arg.data.volume_ml).toBe(350);
    expect(arg.data.bag_code).toBeUndefined();
    expect(arg.data.notes).toBeUndefined();
  });

  it('UTCID02 HOSPITAL_STAFF cannot change facility', async () => {
    await service.updateBlood(10, { volume_ml: 350, facility_id: 2 }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    const arg = prisma.blood_inventory.update.mock.calls[0][0];
    expect(arg.data.facility_id).toBeUndefined();
    expect(arg.data.volume_ml).toBe(350);
  });

  it('UTCID03 empty dto', async () => {
    const res = await service.updateBlood(10, {}, admin);
    expect(res).toBeDefined();
    const data = prisma.blood_inventory.update.mock.calls[0][0].data;
    expect(Object.values(data).every((v) => v === undefined)).toBe(true);
  });

  it('UTCID04 bag not found', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue(null);
    const p = service.updateBlood(999, { volume_ml: 350 }, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy túi máu');
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID05 staff of other facility', async () => {
    const p = service.updateBlood(10, { volume_ml: 350 }, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền sửa túi máu của cơ sở khác');
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID06 discarded bag still editable', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ ...bag, status_code: 'DISCARDED' });
    await expect(service.updateBlood(10, { volume_ml: 350 }, admin)).resolves.toBeDefined();
    expect(prisma.blood_inventory.update).toHaveBeenCalled();
  });

  it('UTCID07 update rejects P2002', async () => {
    const err = Object.assign(new Error('Unique'), { code: 'P2002' });
    prisma.blood_inventory.update.mockRejectedValue(err);
    await expect(service.updateBlood(10, { bag_code: 'BAG-002' }, admin)).rejects.toBe(err);
    expect(prisma.blood_inventory.update).toHaveBeenCalled();
  });
});
