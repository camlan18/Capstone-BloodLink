import { RequestService } from '../request.service';

describe('REQ-014 RequestService.handleCronExpireRequests / handleCronCloseExpiredRequests', () => {
  let prisma: any, service: RequestService;
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const overdue = { request_id: 1, status_id: 3 };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    prisma = {
      blood_request_statuses: {
        findMany: jest.fn().mockResolvedValue([{ status_id: 1 }, { status_id: 2 }, { status_id: 3 }]),
        findFirst: jest.fn(async ({ where }: any) => (where.status_code === 'expired' ? { status_id: 8 } : where.status_code === 'CLOSED' ? { status_id: 9 } : null)),
      },
      blood_requests: {
        findMany: jest.fn().mockResolvedValue([overdue]),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
      blood_request_inventory_allocations: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
      blood_inventory: { update: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 expire request with 2 allocations', async () => {
    prisma.blood_request_inventory_allocations.findMany.mockResolvedValue([
      { allocation_id: 50, inventory_id: 10 }, { allocation_id: 51, inventory_id: 11 },
    ]);
    await expect(service.handleCronExpireRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.update).toHaveBeenCalledWith({ where: { request_id: 1 }, data: { status_id: 8 } });
    expect(prisma.blood_request_status_history.create).toHaveBeenCalledWith({ data: expect.objectContaining({ changed_by: null, to_status_id: 8 }) });
    expect(prisma.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(prisma.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'AVAILABLE' } }));
    expect(prisma.blood_request_inventory_allocations.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_active: false, released_at: expect.any(Date) } }),
    );
    expect(prisma.inventory_transactions.create).toHaveBeenCalledTimes(2);
    expect(prisma.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'RELEASE', reference_type: 'SYSTEM_CRON' }),
    });
  });

  it('UTCID02 expire request without allocations', async () => {
    await expect(service.handleCronExpireRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.update).toHaveBeenCalled();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID03 expired status missing', async () => {
    prisma.blood_request_statuses.findFirst.mockResolvedValue(null);
    await expect(service.handleCronExpireRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.findMany).not.toHaveBeenCalled();
  });

  it('UTCID04 no overdue requests', async () => {
    prisma.blood_requests.findMany.mockResolvedValue([]);
    await expect(service.handleCronExpireRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
  });

  it('UTCID05 query boundaries', async () => {
    await service.handleCronExpireRequests();
    expect(prisma.blood_request_statuses.findMany).toHaveBeenCalledWith({
      where: { status_code: { in: ['pending', 'matching_donors', 'allocated_stock'] } },
    });
    expect(prisma.blood_requests.findMany).toHaveBeenCalledWith({
      where: { required_before: { lt: today() }, status_id: { in: [1, 2, 3] } },
    });
  });

  it('UTCID06 statuses findMany rejects', async () => {
    prisma.blood_request_statuses.findMany.mockRejectedValue(new Error('db'));
    await expect(service.handleCronExpireRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.update).not.toHaveBeenCalled();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID07 close expired requests', async () => {
    await expect(service.handleCronCloseExpiredRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.updateMany).toHaveBeenCalledWith({
      where: {
        status: { status_code: { notIn: ['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED'] } },
        required_before: { lt: today() },
      },
      data: { status_id: 9 },
    });
  });

  it('UTCID08 CLOSED status missing', async () => {
    prisma.blood_request_statuses.findFirst.mockResolvedValue(null);
    await expect(service.handleCronCloseExpiredRequests()).resolves.toBeUndefined();
    expect(prisma.blood_requests.updateMany).not.toHaveBeenCalled();
  });

  it('UTCID09 closed request keeps reserved bags', async () => {
    await expect(service.handleCronCloseExpiredRequests()).resolves.toBeUndefined();
    expect(prisma.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID10 updateMany rejects', async () => {
    prisma.blood_requests.updateMany.mockRejectedValue(new Error('db'));
    await expect(service.handleCronCloseExpiredRequests()).resolves.toBeUndefined();
  });
});
