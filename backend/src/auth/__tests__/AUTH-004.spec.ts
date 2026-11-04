import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
jest.mock('bcrypt');

describe('AUTH-004 AuthService.resendOtp', () => {
  let prisma: any, mail: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const user = (o: any = {}) => ({ user_id: 1, email: 'member01@test.vn', full_name: 'Member', is_email_verified: false, ...o });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue(user()) },
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 1, expiry_minutes: 10, max_attempts: 5 }) },
      user_otps: { deleteMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
    };
    mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma as any, {} as any, mail as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 resend success', async () => {
    const res = await service.resendOtp({ email: 'member01@test.vn' } as any);
    expect(res).toEqual({ message: 'Đã gửi lại mã OTP vào email của bạn.' });
    expect(prisma.user_otps.deleteMany).toHaveBeenCalledWith({ where: { user_id: 1, otp_type_id: 1, is_verified: false } });
    expect(prisma.user_otps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ expires_at: new Date('2026-11-03T08:10:00Z'), otp_hash: 'hashed' }),
    });
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith('member01@test.vn', expect.stringMatching(/^\d{6}$/), 'Member');
  });

  it('UTCID02 uses otp type expiry and attempts', async () => {
    prisma.otp_types.findUnique.mockResolvedValue({ otp_type_id: 1, expiry_minutes: 15, max_attempts: 3 });
    const res = await service.resendOtp({ email: 'member01@test.vn' } as any);
    expect(res.message).toBe('Đã gửi lại mã OTP vào email của bạn.');
    expect(prisma.user_otps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ expires_at: new Date('2026-11-03T08:15:00Z'), max_attempts: 3 }),
    });
  });

  it('UTCID03 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.resendOtp({ email: 'nouser@test.vn' } as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('User không tồn tại');
    expect(prisma.user_otps.deleteMany).not.toHaveBeenCalled();
    expect(prisma.user_otps.create).not.toHaveBeenCalled();
  });

  it('UTCID04 already verified', async () => {
    prisma.users.findUnique.mockResolvedValue(user({ is_email_verified: true }));
    const p = service.resendOtp({ email: 'member01@test.vn' } as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Tài khoản đã được xác thực');
    expect(prisma.user_otps.deleteMany).not.toHaveBeenCalled();
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('UTCID05 otp type missing -> TypeError', async () => {
    prisma.otp_types.findUnique.mockResolvedValue(null);
    await expect(service.resendOtp({ email: 'member01@test.vn' } as any)).rejects.toThrow(TypeError);
    await expect(service.resendOtp({ email: 'member01@test.vn' } as any)).rejects.toThrow("Cannot read properties of null (reading 'otp_type_id')");
    expect(prisma.user_otps.deleteMany).toHaveBeenCalledWith({ where: { user_id: 1, otp_type_id: undefined, is_verified: false } });
  });

  it('UTCID06 mail failure propagates', async () => {
    mail.sendVerificationEmail.mockRejectedValue(new Error('SMTP down'));
    await expect(service.resendOtp({ email: 'member01@test.vn' } as any)).rejects.toThrow('SMTP down');
    expect(prisma.user_otps.create).toHaveBeenCalled();
  });
});
