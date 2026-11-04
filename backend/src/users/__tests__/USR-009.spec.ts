import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';

describe('USR-009 UsersService.getUserById', () => {
  let prisma: any, service: UsersService;
  beforeEach(() => {
    prisma = { users: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() } };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 returns user with relations', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, password_hash: 'x', donor_profile: { blood_type: {} }, donations_donor: [] });
    const res: any = await service.getUserById(2);
    expect(res.user_id).toBe(2);
    expect(res.password_hash).toBeUndefined();
    expect(prisma.users.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: 2 },
      include: expect.objectContaining({
        donor_profile: { include: { blood_type: true } },
        donations_donor: expect.any(Object),
      }),
    }));
  });

  it('UTCID02 donations ordered by created_at desc', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, donations_donor: [{ id: 1 }, { id: 2 }] });
    const res: any = await service.getUserById(2);
    expect(res.donations_donor).toHaveLength(2);
    const arg = prisma.users.findUnique.mock.calls[0][0];
    expect(arg.include.donations_donor).toEqual({ include: { facility: true, component: true }, orderBy: { created_at: 'desc' } });
  });

  it('UTCID03 no donor profile', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 3, donor_profile: null });
    const res: any = await service.getUserById(3);
    expect(res.donor_profile).toBeNull();
    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('UTCID04 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.getUserById(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('User không tồn tại');
  });
});
