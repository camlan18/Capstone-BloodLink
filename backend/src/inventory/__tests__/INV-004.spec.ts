import { InventoryService } from '../inventory.service';

describe('INV-004 InventoryService.getInventoryStats', () => {
  let prisma: any, service: InventoryService;
  const rows = [{ facility_id: 1 }, { facility_id: 2 }];

  beforeEach(() => {
    prisma = { blood_inventory: { groupBy: jest.fn().mockResolvedValue(rows) } };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 ADMIN no facility filter', async () => {
    const res = await service.getInventoryStats({ user_id: 1, role_code: 'ADMIN' }, false);
    expect(res).toEqual(rows);
    expect(prisma.blood_inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status_code: 'AVAILABLE' } }),
    );
  });

  it('UTCID02 staff scoped to facility', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([rows[0]]);
    const res = await service.getInventoryStats({ user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 }, false);
    expect(res).toEqual([rows[0]]);
    expect(prisma.blood_inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status_code: 'AVAILABLE', facility_id: 1 } }),
    );
  });

  it('UTCID03 staff global=true', async () => {
    const res = await service.getInventoryStats({ user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 }, true);
    expect(res).toEqual(rows);
    expect(prisma.blood_inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status_code: 'AVAILABLE' } }),
    );
  });

  it('UTCID04 staff without facility', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([]);
    const res = await service.getInventoryStats({ user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null }, false);
    expect(res).toEqual([]);
    expect(prisma.blood_inventory.groupBy.mock.calls[0][0].where.facility_id).toBe(-1);
  });

  it('UTCID05 empty result', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([]);
    const res = await service.getInventoryStats({ user_id: 1, role_code: 'ADMIN' }, false);
    expect(res).toEqual([]);
    expect(prisma.blood_inventory.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.blood_inventory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['facility_id', 'blood_type_id', 'component_id'] }),
    );
  });
});
