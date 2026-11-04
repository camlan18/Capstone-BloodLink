import { NotificationsService } from '../notifications.service';

describe('NOTI-003 NotificationsService.markAsRead', () => {
  let prisma: any, service: NotificationsService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { notifications: { update: jest.fn().mockResolvedValue({ notification_id: 1, is_read: true }) } };
    service = new NotificationsService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 mark unread as read', async () => {
    const res = await service.markAsRead(1);
    expect(res.is_read).toBe(true);
    expect(prisma.notifications.update).toHaveBeenCalledWith({ where: { notification_id: 1 }, data: { is_read: true, read_at: NOW } });
  });

  it('UTCID02 already read is overwritten', async () => {
    const res = await service.markAsRead(1);
    expect(res.is_read).toBe(true);
    expect(prisma.notifications.update).toHaveBeenCalledTimes(1);
  });

  it('UTCID03 no ownership filter', async () => {
    prisma.notifications.update.mockResolvedValue({ notification_id: 2, user_id: 7, is_read: true });
    const res = await service.markAsRead(2);
    expect(res.notification_id).toBe(2);
    expect(prisma.notifications.update).toHaveBeenCalledWith({ where: { notification_id: 2 }, data: expect.any(Object) });
  });

  it('UTCID04 prisma P2025 propagates', async () => {
    prisma.notifications.update.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));
    await expect(service.markAsRead(999)).rejects.toThrow('Record not found');
    expect(prisma.notifications.update).toHaveBeenCalled();
  });
});
