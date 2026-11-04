import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { user_ids: [1, 2], title: 'Thông báo', message: 'Nội dung', notification_type: 'INFO' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: CreateNotificationDto, data: '' });

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

  it('UTCID06 DTO: user_ids not an array', async () => {
    const err = await runDto({ ...dtoValid, user_ids: '1' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("user_ids must be an array");
  });

  it('UTCID07 DTO: user_ids empty array rejected', async () => {
    const err = await runDto({ ...dtoValid, user_ids: [] }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
  });

  it('UTCID08 DTO: title empty', async () => {
    const err = await runDto({ ...dtoValid, title: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("title should not be empty");
  });

  it('UTCID09 DTO: title 200 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, title: 'a'.repeat(200) })).resolves.toEqual(expect.objectContaining({ title: 'a'.repeat(200) }));
  });

  it('UTCID10 DTO: title 201 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, title: 'a'.repeat(201) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("title must be shorter than or equal to 200 characters");
  });

  it('UTCID11 DTO: message empty', async () => {
    const err = await runDto({ ...dtoValid, message: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("message should not be empty");
  });

  it('UTCID12 DTO: message 1000 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, message: 'a'.repeat(1000) })).resolves.toEqual(expect.objectContaining({ message: 'a'.repeat(1000) }));
  });

  it('UTCID13 DTO: message 1001 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, message: 'a'.repeat(1001) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("message must be shorter than or equal to 1000 characters");
  });

  it('UTCID14 DTO: notification_type empty', async () => {
    const err = await runDto({ ...dtoValid, notification_type: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("notification_type should not be empty");
  });

  it('UTCID15 DTO: notification_type 50 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, notification_type: 'a'.repeat(50) })).resolves.toEqual(expect.objectContaining({ notification_type: 'a'.repeat(50) }));
  });

  it('UTCID16 DTO: notification_type 51 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, notification_type: 'a'.repeat(51) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("notification_type must be shorter than or equal to 50 characters");
  });

  it('UTCID17 DTO: reference_type 50 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, reference_type: 'a'.repeat(50), reference_id: 10 })).resolves.toEqual(expect.objectContaining({ reference_type: 'a'.repeat(50) }));
  });

  it('UTCID18 DTO: reference_type 51 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, reference_type: 'a'.repeat(51), reference_id: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("reference_type must be shorter than or equal to 50 characters");
  });

  it('UTCID19 DTO: reference_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, reference_type: 'REQUEST', reference_id: '10' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("reference_id must be an integer number");
  });

  it('UTCID20 DTO: unknown property stripped by whitelist', async () => {
    const res = await runDto({ ...dtoValid, is_read: true });
    expect(res).toEqual(expect.objectContaining(dtoValid));
    expect(res).not.toHaveProperty('is_read');
  });
});
