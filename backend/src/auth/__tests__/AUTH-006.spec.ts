import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
jest.mock('bcrypt');

describe('AUTH-006 AuthService.forgotPassword', () => {
  let prisma: any, tx: any, mail: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    tx = {
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 3, expiry_minutes: 10, max_attempts: 5 }), create: jest.fn().mockResolvedValue({ otp_type_id: 3 }) },
      user_otps: { updateMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 1, email: 'member01@test.vn', is_active: true }) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    mail = { sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma as any, {} as any, mail as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 forgot password success', async () => {
    const res = await service.forgotPassword({ email: 'member01@test.vn' } as any);
    expect(res).toEqual({ message: 'Đã gửi mã OTP khôi phục mật khẩu vào email của bạn.' });
    expect(tx.user_otps.updateMany).toHaveBeenCalledWith({ where: { user_id: 1, otp_type_id: 3, is_verified: false }, data: { is_verified: true } });
    expect(tx.user_otps.create).toHaveBeenCalledWith({ data: expect.objectContaining({ expires_at: new Date('2026-11-03T08:10:00Z') }) });
    expect(mail.sendForgotPasswordEmail).toHaveBeenCalledWith('member01@test.vn', expect.stringMatching(/^\d{6}$/));
  });

  it('UTCID02 creates RESET_PASSWORD type when missing', async () => {
    tx.otp_types.findUnique.mockResolvedValue(null);
    const res = await service.forgotPassword({ email: 'member01@test.vn' } as any);
    expect(res.message).toBe('Đã gửi mã OTP khôi phục mật khẩu vào email của bạn.');
    expect(tx.otp_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ otp_type_code: 'reset_password' }) });
    expect(tx.user_otps.create).toHaveBeenCalledWith({ data: expect.objectContaining({ max_attempts: 5 }) });
  });

  it('UTCID03 locked user can still request reset', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 1, email: 'member01@test.vn', is_active: false });
    const res = await service.forgotPassword({ email: 'member01@test.vn' } as any);
    expect(res.message).toBe('Đã gửi mã OTP khôi phục mật khẩu vào email của bạn.');
    expect(tx.user_otps.create).toHaveBeenCalled();
    expect(mail.sendForgotPasswordEmail).toHaveBeenCalled();
  });

  it('UTCID04 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.forgotPassword({ email: 'nouser@test.vn' } as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('User không tồn tại');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mail.sendForgotPasswordEmail).not.toHaveBeenCalled();
  });

  it('UTCID05 mail failure propagates', async () => {
    mail.sendForgotPasswordEmail.mockRejectedValue(new Error('SMTP down'));
    await expect(service.forgotPassword({ email: 'member01@test.vn' } as any)).rejects.toThrow('SMTP down');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
