import { InventoryService } from '../inventory.service';

describe('INV-007 InventoryService.handleCronExpireInventory', () => {
  let prisma: any, notif: any, service: InventoryService;
  const bag = (id: number) => ({ inventory_id: id, expiry_date: new Date('2026-11-01T00:00:00Z') });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    prisma = {
      blood_inventory: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    notif = { notifyAdmins: jest.fn().mockResolvedValue(undefined) };
    service = new InventoryService(prisma as any, notif as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 two expired bags', async () => {
    prisma.blood_inventory.findMany.mockResolvedValue([bag(1), bag(2)]);
    await expect(service.handleCronExpireInventory()).resolves.toBeUndefined();
    expect(prisma.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(prisma.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'EXPIRED' } }));
    expect(prisma.inventory_transactions.create).toHaveBeenCalledTimes(2);
    expect(prisma.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'EXPIRE', reference_type: 'SYSTEM_CRON' }),
    });
    expect(notif.notifyAdmins).toHaveBeenCalledTimes(1);
    expect(notif.notifyAdmins.mock.calls[0][2]).toBe('WARNING');
    expect(notif.notifyAdmins.mock.calls[0][3]).toBe('INVENTORY');
  });

  it('UTCID02 none expired', async () => {
    await expect(service.handleCronExpireInventory()).resolves.toBeUndefined();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });

  it('UTCID03 today boundary', async () => {
    await service.handleCronExpireInventory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(prisma.blood_inventory.findMany).toHaveBeenCalledWith({
      where: { expiry_date: { lt: today }, status_code: 'AVAILABLE' },
    });
  });

  it('UTCID04 one bag notifies', async () => {
    prisma.blood_inventory.findMany.mockResolvedValue([bag(1)]);
    await service.handleCronExpireInventory();
    expect(notif.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('UTCID05 findMany rejects', async () => {
    prisma.blood_inventory.findMany.mockRejectedValue(new Error('DB down'));
    await expect(service.handleCronExpireInventory()).resolves.toBeUndefined();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });

  it('UTCID06 update rejects on bag 2', async () => {
    prisma.blood_inventory.findMany.mockResolvedValue([bag(1), bag(2)]);
    prisma.blood_inventory.update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fail'));
    await expect(service.handleCronExpireInventory()).resolves.toBeUndefined();
    expect(prisma.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(prisma.inventory_transactions.create).toHaveBeenCalledTimes(1);
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });
});
