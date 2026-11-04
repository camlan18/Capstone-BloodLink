import { InventoryService } from '../inventory.service';

describe('INV-005 InventoryService.getInventoryList', () => {
  let prisma: any, service: InventoryService;
  const admin = { user_id: 1, role_code: 'ADMIN' };

  beforeEach(() => {
    prisma = {
      blood_inventory: {
        findMany: jest.fn().mockResolvedValue([{ inventory_id: 1 }, { inventory_id: 2 }]),
        count: jest.fn().mockResolvedValue(2),
      },
    };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 defaults', async () => {
    const res = await service.getInventoryList({}, admin);
    expect(res.data).toHaveLength(2);
    expect(res.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blood_inventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20, orderBy: { expiry_date: 'asc' } }),
    );
  });

  it('UTCID02 page 3', async () => {
    prisma.blood_inventory.count.mockResolvedValue(45);
    const res = await service.getInventoryList({ page: '3', limit: '20' }, admin);
    expect(res.meta).toEqual({ total: 45, page: 3, limit: 20, totalPages: 3 });
    expect(prisma.blood_inventory.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
  });

  it('UTCID03 invalid page/limit fall back', async () => {
    prisma.blood_inventory.count.mockResolvedValue(0);
    const res = await service.getInventoryList({ page: 'abc', limit: '0' }, admin);
    expect(res.meta).toEqual(expect.objectContaining({ page: 1, limit: 20, totalPages: 0 }));
    expect(prisma.blood_inventory.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
  });

  it('UTCID04 filters', async () => {
    prisma.blood_inventory.count.mockResolvedValue(1);
    await service.getInventoryList(
      { facility_id: '2', status_code: 'AVAILABLE', blood_type_id: '1', bag_code: 'BAG' },
      admin,
    );
    expect(prisma.blood_inventory.findMany.mock.calls[0][0].where).toEqual({
      facility_id: 2,
      status_code: 'AVAILABLE',
      blood_type_id: 1,
      bag_code: { contains: 'BAG' },
    });
  });

  it('UTCID05 staff scoped, query facility ignored', async () => {
    prisma.blood_inventory.count.mockResolvedValue(1);
    await service.getInventoryList({ facility_id: '2' }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(prisma.blood_inventory.findMany.mock.calls[0][0].where.facility_id).toBe(1);
  });

  it('UTCID06 staff without facility', async () => {
    prisma.blood_inventory.findMany.mockResolvedValue([]);
    prisma.blood_inventory.count.mockResolvedValue(0);
    const res = await service.getInventoryList({}, { user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null });
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(prisma.blood_inventory.findMany.mock.calls[0][0].where.facility_id).toBe(-1);
  });
});
