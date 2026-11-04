import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';

describe('USR-001 UsersService.getProfile', () => {
  let prisma: any, service: UsersService;
  beforeEach(() => {
    prisma = { users: { findUnique: jest.fn() } };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 returns profile without password_hash', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 1, email: 'a@b.vn', password_hash: 'x', role: {}, blood_type: {}, province: {}, ward: {}, facility: null });
    const res: any = await service.getProfile(1);
    expect(res.user_id).toBe(1);
    expect(res.password_hash).toBeUndefined();
    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { user_id: 1 },
      include: { role: true, blood_type: true, province: true, ward: true, facility: true },
    });
  });

  it('UTCID02 hospital staff includes facility', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, password_hash: 'x', facility_id: 1, facility: { facility_name: 'BV A' } });
    const res: any = await service.getProfile(2);
    expect(res.facility).toEqual({ facility_name: 'BV A' });
    expect(prisma.users.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 2 } }));
  });

  it('UTCID03 null relations', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 3, password_hash: 'x', blood_type: null, province: null, ward: null });
    const res: any = await service.getProfile(3);
    expect(res.blood_type).toBeNull();
    expect(res.province).toBeNull();
    expect(res.ward).toBeNull();
  });

  it('UTCID04 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.getProfile(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('User not found');
  });
});
