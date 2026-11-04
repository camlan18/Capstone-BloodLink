import { NotificationsService } from '../notifications.service';

describe('NOTI-002 NotificationsService.getNotifications', () => {
  let prisma: any, service: NotificationsService;
  const setup = (rows: any[], count: number) => {
    prisma.notifications.findMany.mockResolvedValue(rows);
    prisma.notifications.count.mockResolvedValue(count);
  };
  beforeEach(() => {
    prisma = { notifications: { findMany: jest.fn(), count: jest.fn() } };
    service = new NotificationsService(prisma as any);
  });

  it('UTCID01 default paging', async () => {
    setup([{}, {}, {}], 3);
    const res = await service.getNotifications({});
    expect(res.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.notifications.findMany).toHaveBeenCalledWith({
      where: {}, include: { user: { select: { full_name: true, email: true } } }, orderBy: { created_at: 'desc' }, skip: 0, take: 20,
    });
  });

  it('UTCID02 filter by user_id', async () => {
    setup([{}, {}], 2);
    await service.getNotifications({ user_id: '5' });
    expect(prisma.notifications.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 5 } }));
  });

  it('UTCID03 filter by type', async () => {
    setup([{}], 1);
    await service.getNotifications({ notification_type: 'INFO' });
    expect(prisma.notifications.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { notification_type: 'INFO' } }));
  });

  it('UTCID04 search', async () => {
    setup([{}], 1);
    await service.getNotifications({ search: 'máu' });
    expect(prisma.notifications.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ title: { contains: 'máu' } }, { message: { contains: 'máu' } }] },
    }));
  });

  it('UTCID05 page 2 limit 10', async () => {
    setup([], 15);
    const res = await service.getNotifications({ page: '2', limit: '10' });
    expect(res.meta).toEqual({ total: 15, page: 2, limit: 10, totalPages: 2 });
    expect(prisma.notifications.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('UTCID06 invalid page/limit fall back to defaults', async () => {
    setup([], 3);
    const res = await service.getNotifications({ page: '0', limit: 'abc' });
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(20);
    expect(prisma.notifications.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
  });

  it('UTCID07 empty result', async () => {
    setup([], 0);
    const res = await service.getNotifications({});
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(res.meta.totalPages).toBe(0);
  });
});
