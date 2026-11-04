import * as crypto from 'crypto';
import { AuthService } from '../auth.service';

describe('AUTH-008 AuthService.logout', () => {
  let prisma: any, service: AuthService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const OK = { message: 'Đăng xuất thành công' };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { user_sessions: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    service = new AuthService(prisma as any, {} as any, {} as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 revoke active session', async () => {
    await expect(service.logout('a1b2c3')).resolves.toEqual(OK);
    const h = crypto.createHash('sha256').update('a1b2c3').digest('hex');
    expect(prisma.user_sessions.updateMany).toHaveBeenCalledWith({ where: { refresh_token_hash: h, revoked_at: null }, data: { revoked_at: NOW } });
  });

  it('UTCID02 unknown token', async () => {
    prisma.user_sessions.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.logout('unknown')).resolves.toEqual(OK);
    expect(prisma.user_sessions.updateMany).toHaveBeenCalledTimes(1);
  });

  it('UTCID03 undefined token', async () => {
    await expect(service.logout(undefined)).resolves.toEqual(OK);
    expect(prisma.user_sessions.updateMany).not.toHaveBeenCalled();
  });

  it('UTCID04 empty token', async () => {
    await expect(service.logout('')).resolves.toEqual(OK);
    expect(prisma.user_sessions.updateMany).not.toHaveBeenCalled();
  });
});
