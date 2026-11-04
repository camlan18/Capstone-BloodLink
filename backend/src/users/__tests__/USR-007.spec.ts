import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
jest.mock('bcrypt');

describe('USR-007 UsersService.updateUserAdmin', () => {
  let prisma: any, service: UsersService;
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma = {
      users: {
        findUnique: jest.fn().mockResolvedValue({ user_id: 2, role_id: 2 }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ user_id: 2, password_hash: 'x' }),
      },
      roles: {
        findUnique: jest.fn(async ({ where }: any) =>
          where.role_id === 3 ? { role_id: 3, role_code: 'HOSPITAL_STAFF' } : { role_id: where.role_id, role_code: 'USER' }),
      },
    };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });
  const bad = async (d: any, msg: string) => {
    const p = service.updateUserAdmin(2, d);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(prisma.users.update).not.toHaveBeenCalled();
  };

  it('UTCID01 update full_name', async () => {
    const res: any = await service.updateUserAdmin(2, { full_name: ' Tran Thi B ' } as any);
    expect(res.user_id).toBe(2);
    expect(res.password_hash).toBeUndefined();
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: { full_name: 'Tran Thi B' } });
  });

  it('UTCID02 update password', async () => {
    const res: any = await service.updateUserAdmin(2, { password: 'NewPass1' } as any);
    expect(res.user_id).toBe(2);
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: expect.objectContaining({ password_hash: 'hashed' }) });
  });

  it('UTCID03 email taken by other user', async () => {
    prisma.users.findFirst.mockResolvedValue({ user_id: 9 });
    await bad({ email: 'member01@test.vn' }, 'Email đã tồn tại trên hệ thống');
  });

  it('UTCID04 email free', async () => {
    const res: any = await service.updateUserAdmin(2, { email: 'member01@test.vn' } as any);
    expect(res.user_id).toBe(2);
    expect(prisma.users.findFirst).toHaveBeenCalledWith({ where: { email: 'member01@test.vn', user_id: { not: 2 } } });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: expect.objectContaining({ email: 'member01@test.vn' }) });
  });

  it('UTCID05 identity card taken', async () => {
    prisma.users.findFirst.mockResolvedValue({ user_id: 9 });
    await bad({ identity_card: '012345678901' }, 'CCCD/CMND này đã được đăng ký cho một tài khoản khác');
  });

  it('UTCID06 hospital staff facility 0', async () => {
    await bad({ role_id: 3, facility_id: 0 }, 'Vai trò Nhân viên bệnh viện bắt buộc phải chọn Cơ sở y tế trực thuộc');
  });

  it('UTCID07 hospital staff facility 1', async () => {
    const res: any = await service.updateUserAdmin(2, { role_id: 3, facility_id: 1 } as any);
    expect(res.user_id).toBe(2);
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: expect.objectContaining({ role_id: 3, facility_id: 1 }) });
  });

  it('UTCID08 staff role without facility_id is not rejected', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, role_id: 2, facility_id: null });
    const res: any = await service.updateUserAdmin(2, { role_id: 3 } as any);
    expect(res.user_id).toBe(2);
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: expect.objectContaining({ role_id: 3 }) });
  });

  it('UTCID09 donor profile upsert', async () => {
    await service.updateUserAdmin(2, { donor_profile: { weight_kg: 60 } } as any);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { user_id: 2 },
      data: { donor_profile: { upsert: expect.objectContaining({ update: { weight_kg: 60 } }) } },
    });
  });

  it('UTCID10 invalid phone', async () => { await bad({ phone: '12345' }, 'Số điện thoại không hợp lệ'); });

  it('UTCID11 user not found surfaces prisma error', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    prisma.users.update.mockRejectedValue(Object.assign(new Error('Record to update not found'), { code: 'P2025' }));
    await expect(service.updateUserAdmin(999, { full_name: ' Tran Thi B ' } as any)).rejects.toThrow('Record to update not found');
    expect(prisma.users.update).toHaveBeenCalled();
  });
});
