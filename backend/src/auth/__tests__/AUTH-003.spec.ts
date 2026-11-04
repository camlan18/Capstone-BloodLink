import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
jest.mock('bcrypt');

describe('AUTH-003 AuthService.verifyOtp', () => {
  let prisma: any, noti: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const user = (o: any = {}) => ({ user_id: 1, email: 'member01@test.vn', is_active: true, ...o });
  const otp = (o: any = {}) => ({ otp_id: 7, otp_hash: 'h', expires_at: new Date(NOW.getTime() + 5 * 60000), attempt_count: 0, max_attempts: 5, ...o });
  const dto = (o: any = {}) => ({ email: 'member01@test.vn', otp_code: '123456', ...o }) as any;
  const noWrites = () => {
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user_otps.update).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue(user()), update: jest.fn().mockReturnValue('u-update') },
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 1 }) },
      user_otps: { findFirst: jest.fn().mockResolvedValue(otp()), update: jest.fn(), delete: jest.fn().mockReturnValue('o-delete') },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };
    noti = { notifyAdmins: jest.fn().mockResolvedValue(undefined), createNotification: jest.fn().mockResolvedValue(undefined) };
    (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(true);
    service = new AuthService(prisma as any, {} as any, {} as any, noti as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 verify success', async () => {
    const res = await service.verifyOtp(dto());
    expect(res).toEqual({ message: 'Xác thực tài khoản thành công. Bạn có thể đăng nhập.' });
    expect(prisma.user_otps.delete).toHaveBeenCalledWith({ where: { otp_id: 7 } });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: { is_email_verified: true, is_active: true } });
    expect(prisma.$transaction).toHaveBeenCalledWith(['o-delete', 'u-update']);
    expect(noti.notifyAdmins).toHaveBeenCalledWith('Người dùng mới', expect.any(String), expect.anything(), 'USER', 1);
    expect(noti.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [1] }));
  });

  it('UTCID02 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.verifyOtp(dto({ email: 'nouser@test.vn' }));
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('User không tồn tại');
    noWrites();
  });

  it('UTCID03 no pending otp', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(null);
    const p = service.verifyOtp(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Không tìm thấy mã OTP nào đang chờ xác thực');
    noWrites();
  });

  it('UTCID04 otp expired 1s ago', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() - 1000) }));
    const p = service.verifyOtp(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Mã OTP đã hết hạn');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID05 otp expiring in 1s still valid', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() + 1000) }));
    const res = await service.verifyOtp(dto());
    expect(res.message).toBe('Xác thực tài khoản thành công. Bạn có thể đăng nhập.');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID06 attempts 5/5', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 5 }));
    const p = service.verifyOtp(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn đã nhập sai OTP quá nhiều lần');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID07 attempts 4/5 still allowed', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 4 }));
    const res = await service.verifyOtp(dto());
    expect(res.message).toBe('Xác thực tài khoản thành công. Bạn có thể đăng nhập.');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID08 wrong otp code', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const p = service.verifyOtp(dto({ otp_code: '999999' }));
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Mã OTP không hợp lệ');
    expect(prisma.user_otps.update).toHaveBeenCalledWith({ where: { otp_id: 7 }, data: { attempt_count: { increment: 1 } } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID09 locked user gets re-activated', async () => {
    prisma.users.findUnique.mockResolvedValue(user({ is_active: false }));
    const res = await service.verifyOtp(dto());
    expect(res.message).toBe('Xác thực tài khoản thành công. Bạn có thể đăng nhập.');
    expect(prisma.users.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ is_active: true }) }));
  });
});
