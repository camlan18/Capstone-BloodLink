import { UnauthorizedException, ValidationPipe, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from '../auth.service';
import { RefreshTokenDto } from '../dto/auth.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { refresh_token: 'a1b2c3' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: RefreshTokenDto, data: '' });

describe('AUTH-005 AuthService.refreshToken', () => {
  let prisma: any, jwt: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const session = (o: any = {}, u: any = {}) => ({
    session_id: 5,
    user: { user_id: 1, email: 'member01@test.vn', full_name: 'M', avatar_url: null, is_active: true, facility_id: null, facility: null, role: { role_code: 'USER' }, ...u },
    ...o,
  });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { user_sessions: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    service = new AuthService(prisma as any, jwt as any, {} as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 rotate token success', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue(session());
    const res = await service.refreshToken('a1b2c3');
    expect(res.access_token).toBe('jwt-token');
    expect(res.refresh_token).toMatch(/^[0-9a-f]{80}$/);
    expect(res.user).toEqual(expect.objectContaining({ id: 1, email: 'member01@test.vn', role: 'USER' }));
    const h = crypto.createHash('sha256').update('a1b2c3').digest('hex');
    expect(prisma.user_sessions.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { refresh_token_hash: h, revoked_at: null, expires_at: { gt: NOW } },
    }));
    const newHash = crypto.createHash('sha256').update(res.refresh_token).digest('hex');
    expect(prisma.user_sessions.update).toHaveBeenCalledWith({
      where: { session_id: 5 },
      data: { refresh_token_hash: newHash, expires_at: new Date('2026-12-03T08:00:00Z'), last_used_at: NOW },
    });
    expect(jwt.sign).toHaveBeenCalled();
  });

  it('UTCID02 user without facility', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue(session());
    const res = await service.refreshToken('a1b2c3');
    expect(res.user.facility).toBeUndefined();
    expect(prisma.user_sessions.update).toHaveBeenCalled();
  });

  it('UTCID03 empty token', async () => {
    const p = service.refreshToken('');
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Refresh token không hợp lệ');
    expect(prisma.user_sessions.findFirst).not.toHaveBeenCalled();
  });

  it('UTCID04 undefined token', async () => {
    const p = service.refreshToken(undefined as any);
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Refresh token không hợp lệ');
    expect(prisma.user_sessions.findFirst).not.toHaveBeenCalled();
  });

  it('UTCID05 session not found', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue(null);
    const p = service.refreshToken('a1b2c3');
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Refresh token không hợp lệ hoặc đã hết hạn');
    expect(prisma.user_sessions.update).not.toHaveBeenCalled();
  });

  it('UTCID06 user inactive', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue(session({}, { is_active: false }));
    const p = service.refreshToken('a1b2c3');
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Refresh token không hợp lệ hoặc đã hết hạn');
    expect(prisma.user_sessions.update).not.toHaveBeenCalled();
  });

  it('UTCID07 session user null', async () => {
    prisma.user_sessions.findFirst.mockResolvedValue({ session_id: 5, user: null });
    const p = service.refreshToken('a1b2c3');
    await expect(p).rejects.toThrow(UnauthorizedException);
    await expect(p).rejects.toThrow('Refresh token không hợp lệ hoặc đã hết hạn');
    expect(prisma.user_sessions.update).not.toHaveBeenCalled();
  });

  it('UTCID08 DTO: refresh_token empty', async () => {
    const err = await runDto({ ...dtoValid, refresh_token: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Refresh token không được để trống");
  });

  it('UTCID09 DTO: refresh_token not a string', async () => {
    const err = await runDto({ ...dtoValid, refresh_token: 12345 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("refresh_token must be a string");
  });
});
