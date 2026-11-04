import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';

describe('USR-008 UsersService.toggleLockUser', () => {
  let prisma: any, service: UsersService;
  beforeEach(() => {
    prisma = { users: { findUnique: jest.fn(), update: jest.fn() } };
    prisma.users.update.mockImplementation(async ({ data }: any) => ({ is_active: data.is_active }));
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 lock active user', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, is_active: true, role: { role_code: 'USER' } });
    await expect(service.toggleLockUser(2)).resolves.toEqual({ message: 'Đã khóa tài khoản' });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: { is_active: false } });
  });

  it('UTCID02 unlock locked user', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 2, is_active: false, role: { role_code: 'USER' } });
    await expect(service.toggleLockUser(2)).resolves.toEqual({ message: 'Đã mở khóa tài khoản' });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 2 }, data: { is_active: true } });
  });

  it('UTCID03 lock hospital staff', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 3, is_active: true, role: { role_code: 'HOSPITAL_STAFF' } });
    await expect(service.toggleLockUser(3)).resolves.toEqual({ message: 'Đã khóa tài khoản' });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 3 }, data: { is_active: false } });
  });

  it('UTCID04 user not found', async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    const p = service.toggleLockUser(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('User không tồn tại');
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID05 cannot lock admin', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 1, is_active: true, role: { role_code: 'ADMIN' } });
    const p = service.toggleLockUser(1);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Không thể khóa Super Admin');
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
