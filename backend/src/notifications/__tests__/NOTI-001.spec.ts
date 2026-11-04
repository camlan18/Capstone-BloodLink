import { NotificationsService } from '../notifications.service';

describe('NOTI-001 NotificationsService.createNotification', () => {
  let prisma: any, service: NotificationsService;
  const MSG = 'Cần chọn ít nhất 1 người dùng để gửi thông báo';
  beforeEach(() => {
    prisma = { notifications: { createMany: jest.fn().mockResolvedValue({ count: 2 }) } };
    service = new NotificationsService(prisma as any);
  });

  it('UTCID01 create for two users', async () => {
    const res = await service.createNotification({ user_ids: [1, 2], title: 'Thông báo', notification_type: 'INFO' } as any);
    expect(res).toEqual({ message: 'Đã gửi thành công 2 thông báo' });
    const arg = prisma.notifications.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(2);
    expect(arg.data.every((r: any) => r.is_read === false)).toBe(true);
  });

  it('UTCID02 with reference', async () => {
    prisma.notifications.createMany.mockResolvedValue({ count: 1 });
    const res = await service.createNotification({ user_ids: [1], title: 'Thông báo', notification_type: 'INFO', reference_type: 'REQUEST', reference_id: 10 } as any);
    expect(res).toEqual({ message: 'Đã gửi thành công 1 thông báo' });
    expect(prisma.notifications.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ user_id: 1, reference_type: 'REQUEST', reference_id: 10 })],
    });
  });

  it('UTCID03 empty user_ids', async () => {
    const p = service.createNotification({ user_ids: [], title: 'Thông báo', notification_type: 'INFO' } as any);
    await expect(p).rejects.toThrow(Error);
    await expect(p).rejects.toThrow(MSG);
    expect(prisma.notifications.createMany).not.toHaveBeenCalled();
  });

  it('UTCID04 undefined user_ids', async () => {
    const p = service.createNotification({ user_ids: undefined, title: 'Thông báo', notification_type: 'INFO' } as any);
    await expect(p).rejects.toThrow(Error);
    await expect(p).rejects.toThrow(MSG);
    expect(prisma.notifications.createMany).not.toHaveBeenCalled();
  });

  it('UTCID05 prisma error propagates', async () => {
    prisma.notifications.createMany.mockRejectedValue(Object.assign(new Error('FK violation'), { code: 'P2003' }));
    await expect(service.createNotification({ user_ids: [999], title: 'Thông báo', notification_type: 'INFO' } as any)).rejects.toThrow('FK violation');
    expect(prisma.notifications.createMany).toHaveBeenCalledTimes(1);
  });
});
