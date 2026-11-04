import { DashboardService } from '../dashboard.service';

describe('SYS-004 DashboardService.getStats', () => {
  let prisma: any, service: DashboardService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const ADMIN = { role_code: 'ADMIN' };
  const staff = (facility_id: any) => ({ role_code: 'HOSPITAL_STAFF', facility_id });
  const d = (y: number, m: number, day: number, h = 0, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, day, h, mi, s, ms);
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      blog_posts: { count: jest.fn().mockResolvedValue(5) },
      blog_categories: { count: jest.fn().mockResolvedValue(3) },
      blog_comments: { count: jest.fn().mockResolvedValue(7) },
      education_documents: { count: jest.fn().mockResolvedValue(4) },
      education_document_categories: { count: jest.fn().mockResolvedValue(2) },
      donations: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
      blood_inventory: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { volume_ml: 900 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      users: { count: jest.fn().mockResolvedValue(10) },
      facility_donation_schedules: { count: jest.fn().mockResolvedValue(2) },
      blood_request_statuses: { findUnique: jest.fn().mockResolvedValue({ status_id: 1 }) },
      blood_requests: { count: jest.fn().mockResolvedValue(3) },
      blood_types: { findMany: jest.fn().mockResolvedValue([{ blood_type_id: 1, blood_type_code: 'A+' }, { blood_type_id: 2, blood_type_code: 'O+' }]) },
    };
    service = new DashboardService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());
  const donationWhere = () => prisma.donations.count.mock.calls[0][0].where;

  it('UTCID01 moderator stats', async () => {
    const res: any = await service.getStats(undefined, undefined, undefined, { role_code: 'MODERATOR' });
    expect(res.stats).toEqual({ posts: 5, categories: 3, comments: 7, documents: 4, docCategories: 2 });
    expect(res.alerts).toEqual({ pendingComments: 7 });
    expect(res.chartData).toEqual([]);
    expect(prisma.blog_comments.count).toHaveBeenCalledWith({ where: { is_approved: false } });
    expect(prisma.donations.count).not.toHaveBeenCalled();
  });

  it('UTCID02 admin default range', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([{ blood_type_id: 1, _count: { inventory_id: 12 }, _sum: { volume_ml: 5400 } }]);
    const res: any = await service.getStats(undefined, undefined, undefined, ADMIN);
    expect(res.stats).toEqual({ todayDonations: 1, totalVolume: 900, newDonors: 10, activeCampaigns: 2, pendingRequests: 3, totalDonors: 10 });
    expect(res.alerts).toEqual({ lowInventory: 'Không có', emergencyRequests: 3, pendingComments: 0, upcomingSchedules: 2 });
    expect(res.chartData).toHaveLength(8);
    expect(res.chartData[0]).toEqual({ date: '27/10', count: 0 });
    expect(res.chartData[7]).toEqual({ date: '03/11', count: 0 });
    expect(res.inventoryChartData).toEqual([{ bloodType: 'A+', volume: 5400, count: 12 }]);
    expect(donationWhere()).not.toHaveProperty('facility_id');
  });

  it('UTCID03 no user behaves like admin', async () => {
    const res: any = await service.getStats(undefined, undefined, undefined, undefined);
    expect(res.stats.todayDonations).toBe(1);
    expect(res.stats.totalVolume).toBe(900);
    expect(donationWhere()).not.toHaveProperty('facility_id');
  });

  it('UTCID04 custom range 01/10..03/10', async () => {
    const res: any = await service.getStats('2026-10-01', '2026-10-03', undefined, ADMIN);
    expect(res.chartData.map((c: any) => c.date)).toEqual(['01/10', '02/10', '03/10']);
    expect(prisma.blood_inventory.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { collection_date: { gte: d(2026, 10, 1, 0, 0, 0, 0), lte: d(2026, 10, 3, 23, 59, 59, 999) } },
    }));
  });

  it('UTCID05 admin with facility param', async () => {
    await service.getStats(undefined, undefined, '2', ADMIN);
    expect(donationWhere().facility_id).toBe(2);
    expect(prisma.blood_requests.count).toHaveBeenCalledWith({ where: { status_id: 1, facility_id: 2 } });
  });

  it('UTCID06 staff facility overrides param', async () => {
    await service.getStats(undefined, undefined, '2', staff(1));
    expect(donationWhere().facility_id).toBe(1);
    expect(prisma.blood_inventory.aggregate.mock.calls[0][0].where.facility_id).toBe(1);
    expect(prisma.facility_donation_schedules.count.mock.calls[0][0].where.facility_id).toBe(1);
    expect(prisma.blood_requests.count.mock.calls[0][0].where.facility_id).toBe(1);
  });

  it('UTCID07 staff without facility -> -1', async () => {
    await service.getStats(undefined, undefined, undefined, staff(null));
    expect(donationWhere().facility_id).toBe(-1);
  });

  it('UTCID08 NaN facility ignored', async () => {
    await service.getStats(undefined, undefined, 'abc', ADMIN);
    expect(donationWhere()).not.toHaveProperty('facility_id');
  });

  it('UTCID09 PENDING status missing', async () => {
    prisma.blood_request_statuses.findUnique.mockResolvedValue(null);
    const res: any = await service.getStats(undefined, undefined, undefined, ADMIN);
    expect(res.stats.pendingRequests).toBe(0);
    expect(res.alerts.emergencyRequests).toBe(0);
    expect(prisma.blood_requests.count).not.toHaveBeenCalled();
  });

  it('UTCID10 low inventory threshold (9 low, 10 ok)', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([
      { blood_type_id: 1, _count: { inventory_id: 9 }, _sum: { volume_ml: 100 } },
      { blood_type_id: 2, _count: { inventory_id: 10 }, _sum: { volume_ml: 100 } },
    ]);
    const res: any = await service.getStats(undefined, undefined, undefined, ADMIN);
    expect(res.alerts.lowInventory).toBe('A+');
    expect(prisma.blood_types.findMany).toHaveBeenCalled();
  });

  it('UTCID11 no low inventory', async () => {
    prisma.blood_inventory.groupBy.mockResolvedValue([
      { blood_type_id: 1, _count: { inventory_id: 10 }, _sum: { volume_ml: 100 } },
      { blood_type_id: 2, _count: { inventory_id: 20 }, _sum: { volume_ml: 100 } },
    ]);
    const res: any = await service.getStats(undefined, undefined, undefined, ADMIN);
    expect(res.alerts.lowInventory).toBe('Không có');
  });

  it('UTCID12 start after end', async () => {
    const res: any = await service.getStats('2026-10-05', '2026-10-03', undefined, ADMIN);
    expect(res.chartData).toEqual([]);
  });

  it('UTCID13 chart counts donations per day', async () => {
    prisma.donations.findMany.mockResolvedValue([{ donation_date: d(2026, 10, 2, 9) }, { donation_date: d(2026, 10, 2, 14) }]);
    const res: any = await service.getStats('2026-10-01', '2026-10-03', undefined, ADMIN);
    expect(res.chartData).toEqual([{ date: '01/10', count: 0 }, { date: '02/10', count: 2 }, { date: '03/10', count: 0 }]);
    expect(prisma.donations.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { donation_date: true } }));
  });

  it('UTCID14 staff sees system-wide donor counts', async () => {
    await service.getStats(undefined, undefined, undefined, staff(1));
    for (const call of prisma.users.count.mock.calls) {
      expect(call[0].where).not.toHaveProperty('facility_id');
    }
    expect(prisma.users.count).toHaveBeenCalledTimes(2);
  });
});
