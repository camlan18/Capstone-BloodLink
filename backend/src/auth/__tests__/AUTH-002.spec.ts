import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
jest.mock('bcrypt');

describe('AUTH-002 AuthService.register', () => {
  let prisma: any, tx: any, mail: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const dto = (o: any = {}) => ({ email: 'new01@test.vn', password: 'Abc@123', full_name: 'Nguyen Van A', username: 'newuser01', ...o });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    tx = {
      users: { create: jest.fn().mockResolvedValue({ user_id: 10, email: 'new01@test.vn' }) },
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 1, expiry_minutes: 10, max_attempts: 5 }), create: jest.fn().mockResolvedValue({ otp_type_id: 2 }) },
      user_otps: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue(null) },
      roles: { findUnique: jest.fn().mockResolvedValue({ role_id: 2, role_code: 'USER' }) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prisma as any, {} as any, mail as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 register success', async () => {
    const res = await service.register(dto() as any);
    expect(res).toEqual({ message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.', user_id: 10, email: 'new01@test.vn' });
    expect(tx.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_email_verified: false, username: 'newuser01' }) });
    expect(tx.user_otps.create).toHaveBeenCalledWith({ data: expect.objectContaining({ otp_hash: 'hashed', max_attempts: 5 }) });
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith('new01@test.vn', expect.stringMatching(/^\d{6}$/), 'Nguyen Van A');
  });

  it('UTCID02 register without username', async () => {
    const res = await service.register(dto({ username: undefined }) as any);
    expect(res).toEqual(expect.objectContaining({ user_id: 10, email: 'new01@test.vn' }));
    expect(tx.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ username: null }) });
  });

  it('UTCID03 creates REGISTER_VERIFY otp type when missing', async () => {
    tx.otp_types.findUnique.mockResolvedValue(null);
    const res = await service.register(dto() as any);
    expect(res.user_id).toBe(10);
    expect(tx.otp_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ otp_type_code: 'register_verify' }) });
    expect(tx.user_otps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ expires_at: new Date('2026-11-03T08:10:00Z'), max_attempts: 5 }),
    });
  });

  it('UTCID04 uses otp type expiry and max attempts', async () => {
    tx.otp_types.findUnique.mockResolvedValue({ otp_type_id: 1, expiry_minutes: 15, max_attempts: 3 });
    const res = await service.register(dto() as any);
    expect(res.user_id).toBe(10);
    expect(tx.user_otps.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ expires_at: new Date('2026-11-03T08:15:00Z'), max_attempts: 3 }),
    });
  });

  it('UTCID05 email already used', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
    const p = service.register(dto({ email: 'member01@test.vn' }) as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Email đã được sử dụng');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('UTCID06 USER role missing', async () => {
    prisma.roles.findUnique.mockResolvedValue(null);
    const p = service.register(dto() as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Hệ thống chưa cấu hình Role MEMBER');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('UTCID07 mail failure propagates after commit', async () => {
    mail.sendVerificationEmail.mockRejectedValue(new Error('SMTP down'));
    await expect(service.register(dto() as any)).rejects.toThrow('SMTP down');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.users.create).toHaveBeenCalled();
    expect(tx.user_otps.create).toHaveBeenCalled();
  });
});
