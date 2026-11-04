import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { ResetPasswordDto } from '../dto/auth.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { email: 'member01@test.vn', otp_code: '123456', new_password: 'NewPass@123' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: ResetPasswordDto, data: '' });
jest.mock('bcrypt');

describe('AUTH-007 AuthService.resetPassword', () => {
  let prisma: any, noti: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const otp = (o: any = {}) => ({ otp_id: 7, otp_hash: 'h', expires_at: new Date(NOW.getTime() + 5 * 60000), attempt_count: 0, max_attempts: 5, ...o });
  const dto = (o: any = {}) => ({ email: 'member01@test.vn', otp_code: '123456', new_password: 'NewPass@123', ...o }) as any;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 1 }), update: jest.fn().mockReturnValue('u') },
      otp_types: { findUnique: jest.fn().mockResolvedValue({ otp_type_id: 3 }) },
      user_otps: { findFirst: jest.fn().mockResolvedValue(otp()), update: jest.fn().mockReturnValue('o') },
      user_sessions: { updateMany: jest.fn().mockReturnValue('s') },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };
    noti = { createNotification: jest.fn().mockResolvedValue(undefined) };
    (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(true);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
    service = new AuthService(prisma as any, {} as any, {} as any, noti as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 reset success', async () => {
    const res = await service.resetPassword(dto());
    expect(res).toEqual({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
    expect(prisma.user_otps.update).toHaveBeenCalledWith({ where: { otp_id: 7 }, data: { is_verified: true, verified_at: NOW } });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: { password_hash: 'newhash' } });
    expect(prisma.user_sessions.updateMany).toHaveBeenCalledWith({ where: { user_id: 1, revoked_at: null }, data: { revoked_at: NOW } });
    expect(noti.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [1], notification_type: 'SUCCESS' }));
  });

  it('UTCID02 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.resetPassword(dto({ email: 'nouser@test.vn' }));
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('User không tồn tại');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID03 no pending otp', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(null);
    const p = service.resetPassword(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Không tìm thấy mã OTP nào đang chờ xác thực');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID04 otp expired', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() - 1000) }));
    const p = service.resetPassword(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Mã OTP đã hết hạn');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID05 otp expiring in 1s still valid', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ expires_at: new Date(NOW.getTime() + 1000) }));
    const res = await service.resetPassword(dto());
    expect(res.message).toBe('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID06 attempts 5/5', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 5 }));
    const p = service.resetPassword(dto());
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn đã nhập sai OTP quá nhiều lần');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID07 attempts 4/5 still allowed', async () => {
    prisma.user_otps.findFirst.mockResolvedValue(otp({ attempt_count: 4 }));
    const res = await service.resetPassword(dto());
    expect(res.message).toBe('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('UTCID08 wrong otp', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const p = service.resetPassword(dto({ otp_code: '999999' }));
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Mã OTP không hợp lệ');
    expect(prisma.user_otps.update).toHaveBeenCalledWith({ where: { otp_id: 7 }, data: { attempt_count: { increment: 1 } } });
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID09 DTO: email empty', async () => {
    const err = await runDto({ ...dtoValid, email: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Email không được để trống");
  });

  it('UTCID10 DTO: email invalid format', async () => {
    const err = await runDto({ ...dtoValid, email: 'member01.test.vn' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Email không hợp lệ");
  });

  it('UTCID11 DTO: otp_code empty', async () => {
    const err = await runDto({ ...dtoValid, otp_code: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("OTP không được để trống");
  });

  it('UTCID12 DTO: otp_code 5 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, otp_code: '12345' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("OTP phải có 6 ký tự");
  });

  it('UTCID13 DTO: otp_code 6 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, otp_code: '654321' })).resolves.toEqual(expect.objectContaining({ otp_code: '654321' }));
  });

  it('UTCID14 DTO: otp_code 7 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, otp_code: '1234567' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("otp_code must be shorter than or equal to 6 characters");
  });

  it('UTCID15 DTO: new_password empty', async () => {
    const err = await runDto({ ...dtoValid, new_password: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Mật khẩu mới không được để trống");
  });

  it('UTCID16 DTO: new_password 5 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, new_password: '12345' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Mật khẩu mới phải có ít nhất 6 ký tự");
  });

  it('UTCID17 DTO: new_password 6 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, new_password: '123456' })).resolves.toEqual(expect.objectContaining({ new_password: '123456' }));
  });
});
