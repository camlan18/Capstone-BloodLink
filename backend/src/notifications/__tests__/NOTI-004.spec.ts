import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';

describe('NOTI-004 NotificationsService.deleteNotification', () => {
  let prisma: any, service: NotificationsService;
  beforeEach(() => {
    prisma = { notifications: { findUnique: jest.fn(), delete: jest.fn() } };
    service = new NotificationsService(prisma as any);
  });

  it('UTCID01 delete existing', async () => {
    prisma.notifications.findUnique.mockResolvedValue({ notification_id: 1 });
    prisma.notifications.delete.mockResolvedValue({ notification_id: 1 });
    await expect(service.deleteNotification(1)).resolves.toEqual({ notification_id: 1 });
    expect(prisma.notifications.delete).toHaveBeenCalledWith({ where: { notification_id: 1 } });
  });

  it('UTCID02 not found', async () => {
    prisma.notifications.findUnique.mockResolvedValue(null);
    const p = service.deleteNotification(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông báo');
    expect(prisma.notifications.delete).not.toHaveBeenCalled();
  });

  it('UTCID03 id 0 not found', async () => {
    prisma.notifications.findUnique.mockResolvedValue(null);
    const p = service.deleteNotification(0);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông báo');
    expect(prisma.notifications.delete).not.toHaveBeenCalled();
  });

  it('UTCID04 concurrent delete error propagates', async () => {
    prisma.notifications.findUnique.mockResolvedValue({ notification_id: 1 });
    prisma.notifications.delete.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));
    await expect(service.deleteNotification(1)).rejects.toThrow('Record not found');
    expect(prisma.notifications.delete).toHaveBeenCalled();
  });
});
