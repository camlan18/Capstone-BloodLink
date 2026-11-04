import { TransferService } from '../transfer.service';

describe('TRANSFER-008 TransferService.handleExpiredTransfers', () => {
  let prisma: any, service: TransferService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
    prisma = {
      blood_transfers: {
        findMany: jest.fn().mockResolvedValue([{ transfer_id: 1 }, { transfer_id: 2 }]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      blood_inventory: { update: jest.fn() },
    };
    service = new TransferService(prisma as any, {} as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 cancels expired transfers', async () => {
    await expect(service.handleExpiredTransfers()).resolves.toBeUndefined();
    expect(prisma.blood_transfers.updateMany).toHaveBeenCalledWith({
      where: { transfer_id: { in: [1, 2] } },
      data: expect.objectContaining({
        status: 'CANCELLED',
        reject_reason: 'Hệ thống tự động hủy do quá hạn thời gian yêu cầu',
      }),
    });
  });

  it('UTCID02 none expired', async () => {
    prisma.blood_transfers.findMany.mockResolvedValue([]);
    await expect(service.handleExpiredTransfers()).resolves.toBeUndefined();
    expect(prisma.blood_transfers.updateMany).not.toHaveBeenCalled();
  });

  it('UTCID03 query boundary', async () => {
    await service.handleExpiredTransfers();
    expect(prisma.blood_transfers.findMany).toHaveBeenCalledWith({
      where: { required_before: { lt: new Date('2026-11-03T10:00:00') }, status: { in: ['PENDING', 'APPROVED'] } },
    });
  });

  it('UTCID04 allocated bags not released', async () => {
    prisma.blood_transfers.findMany.mockResolvedValue([{ transfer_id: 1, status: 'APPROVED', inventory_ids: '[{"id":10}]' }]);
    await expect(service.handleExpiredTransfers()).resolves.toBeUndefined();
    expect(prisma.blood_transfers.updateMany).toHaveBeenCalled();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID05 findMany rejects', async () => {
    prisma.blood_transfers.findMany.mockRejectedValue(new Error('db'));
    await expect(service.handleExpiredTransfers()).resolves.toBeUndefined();
    expect(prisma.blood_transfers.updateMany).not.toHaveBeenCalled();
  });
});
