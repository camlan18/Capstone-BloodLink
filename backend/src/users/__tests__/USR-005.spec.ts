import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
jest.mock('bcrypt');

describe('USR-005 UsersService.changePassword', () => {
  let prisma: any, noti: any, service: UsersService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const otp = (o: any = {}) => ({ otp_id: 7, otp_hash: 'h', expires_at: new Date(NOW.getTime() + 5 * 60000), attempt_count: 0, max_attempts: 5, ...o });
  const dto = (o: any = {}) => ({ otp_code: '123456', new_password: 'NewPass@123', ...o }) as any;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 1 }), update: jest.fn().mockReturnValue('u') },
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 4 }) },
      user_otps: { findFirst: jest.fn().mockResolvedValue(otp()), update: jest.fn().mockReturnValue('o') },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };
    noti = { createNotification: jest.fn().mockResolvedValue(undefined) };
    (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(true);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
    service = new UsersService(prisma as any, {} as any, {} as any, noti as any);
  });
  afterEach(() => jest.useRealTimers());
  const bad = async (msg: string) => {
    const p = service.changePassword(1, dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
  };

  it('UTCID01 change success', async () => {
    const res = await service.changePassword(1, dto());
    expect(res).toEqual({ message: 'Đổi mật khẩu thành công' });
    expect(prisma.user_otps.update).toHaveBeenCalledWith({ where: { otp_id: 7 }, data: { is_verified: true, verified_at: NOW } });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: { password_hash: 'newhash' } });
    expect(noti.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [1], notification_type: 'SUCCESS' }));
  });

  it('UTCID02 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.changePassword(999, dto());
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('User không tồn tại');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID03 no pending otp', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(null);
    await bad('Không tìm thấy mã OTP nào đang chờ xác thực');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID04 otp expired', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() - 1000) }));
    await bad('Mã OTP đã hết hạn');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID05 otp expiring in 1s valid', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() + 1000) }));
    const res = await service.changePassword(1, dto());
    expect(res.message).toBe('Đổi mật khẩu thành công');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID06 attempts 5/5', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 5 }));
    await bad('Bạn đã nhập sai OTP quá nhiều lần');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID07 attempts 4/5 valid', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 4 }));
    const res = await service.changePassword(1, dto());
    expect(res.message).toBe('Đổi mật khẩu thành công');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID08 wrong otp', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await bad('Mã OTP không hợp lệ');
    expect(prisma.user_otps.update).toHaveBeenCalledWith({ where: { otp_id: 7 }, data: { attempt_count: { increment: 1 } } });
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
