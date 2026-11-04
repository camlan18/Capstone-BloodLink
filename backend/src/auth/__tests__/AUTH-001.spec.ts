import { UnauthorizedException, ValidationPipe, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/auth.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { identifier: 'member01@test.vn', password: 'Abc@123' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: LoginDto, data: '' });
jest.mock('bcrypt');

describe('AUTH-001 AuthService.login', () => {
  let prisma: any, jwt: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const baseUser = (o: any = {}) => ({
    user_id: 1, email: 'member01@test.vn', username: 'member01', full_name: 'Member', avatar_url: null,
    password_hash: 'hash', is_email_verified: true, is_active: true, facility_id: null, facility: null,
    role: { role_code: 'USER', role_name: 'Thành viên' }, ...o,
  });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      users: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      user_sessions: { create: jest.fn().mockResolvedValue({}) },
    };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    (bcrypt.compare as jest.Mock).mockReset().mockResolvedValue(true);
    service = new AuthService(prisma as any, jwt as any, {} as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 login by email success', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser());
    const res = await service.login({ identifier: 'member01@test.vn', password: 'Abc@123' } as any, undefined);
    expect(res.access_token).toBe('jwt-token');
    expect(res.refresh_token).toMatch(/^[0-9a-f]{80}$/);
    expect(res.user.role).toEqual({ role_code: 'USER', role_name: 'Thành viên' });
    const expHash = crypto.createHash('sha256').update(res.refresh_token).digest('hex');
    expect(prisma.user_sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ refresh_token_hash: expHash, ip_address: null, device_info: null, expires_at: new Date('2026-12-03T08:00:00Z') }),
    });
    expect(prisma.users.update).toHaveBeenCalledWith(expect.objectContaining({ data: { last_login_at: NOW } }));
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 1, email: 'member01@test.vn', role: 'USER', facility_id: null });
  });

  it('UTCID02 login by username with metadata', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser());
    const res = await service.login({ identifier: 'member01', password: 'Abc@123' } as any, { ip_address: '1.2.3.4', device_info: 'Chrome' });
    expect(res).toEqual(expect.objectContaining({ access_token: 'jwt-token', refresh_token: expect.any(String), user: expect.any(Object) }));
    expect(prisma.users.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ email: 'member01' }, { username: 'member01' }] },
    }));
    expect(prisma.user_sessions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip_address: '1.2.3.4', device_info: 'Chrome' }),
    });
  });

  it('UTCID03 hospital staff returns facility', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser({
      email: 'staff01@test.vn', facility_id: 1, facility: { facility_name: 'BV A' },
      role: { role_code: 'HOSPITAL_STAFF', role_name: 'NV' },
    }));
    const res = await service.login({ identifier: 'staff01@test.vn', password: 'Abc@123' } as any);
    expect(res.user.facility_id).toBe(1);
    expect(res.user.facility).toEqual({ facility_name: 'BV A' });
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ facility_id: 1 }));
  });

  it('UTCID04 user not found', async () => {
    prisma.users.findFirst.mockResolvedValue(null);
    const p = service.login({ identifier: 'nouser@test.vn', password: 'Abc@123' } as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Email hoặc mật khẩu không chính xác');
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user_sessions.create).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID05 email not verified', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser({ is_email_verified: false }));
    const p = service.login({ identifier: 'member01@test.vn', password: 'Abc@123' } as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Tài khoản chưa xác thực email');
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user_sessions.create).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID06 account locked', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser({ is_active: false }));
    const p = service.login({ identifier: 'member01@test.vn', password: 'Abc@123' } as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Tài khoản đã bị khóa');
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(prisma.user_sessions.create).not.toHaveBeenCalled();
  });

  it('UTCID07 wrong password', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser());
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const p = service.login({ identifier: 'member01@test.vn', password: 'Wrong@123' } as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Email hoặc mật khẩu không chính xác');
    expect(prisma.user_sessions.create).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID08 unverified account with wrong password reports status first', async () => {
    prisma.users.findFirst.mockResolvedValue(baseUser({ is_email_verified: false }));
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const p = service.login({ identifier: 'member01@test.vn', password: 'Wrong@123' } as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Tài khoản chưa xác thực email');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('UTCID09 DTO: identifier empty', async () => {
    const err = await runDto({ ...dtoValid, identifier: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Email hoặc Tên đăng nhập không được để trống");
  });

  it('UTCID10 DTO: identifier not a string', async () => {
    const err = await runDto({ ...dtoValid, identifier: 12345 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("identifier must be a string");
  });

  it('UTCID11 DTO: password empty', async () => {
    const err = await runDto({ ...dtoValid, password: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Mật khẩu không được để trống");
  });

  it('UTCID12 DTO: password 5 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, password: '12345' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Mật khẩu phải có ít nhất 6 ký tự");
  });

  it('UTCID13 DTO: password 6 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, password: '123456' })).resolves.toEqual(expect.objectContaining({ password: '123456' }));
  });
});
