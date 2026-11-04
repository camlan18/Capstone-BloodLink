import { BadRequestException } from '@nestjs/common';
import { UsersService } from '../users.service';

describe('USR-002 UsersService.updateProfile', () => {
  let prisma: any, service: UsersService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { users: { update: jest.fn().mockResolvedValue({ user_id: 1, password_hash: 'x' }) } };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });
  afterEach(() => jest.useRealTimers());
  const rejects = async (data: any, msg: string) => {
    const p = service.updateProfile(1, data);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(prisma.users.update).not.toHaveBeenCalled();
  };

  it('UTCID01 update basic fields', async () => {
    const res: any = await service.updateProfile(1, { full_name: ' Nguyen Van A ', phone: '0901234567', gender: 'M' });
    expect(res.user_id).toBe(1);
    expect(res.password_hash).toBeUndefined();
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: expect.objectContaining({ full_name: 'Nguyen Van A', phone: '0901234567' }) });
  });

  it('UTCID02 normalizes ids <= 0 to null', async () => {
    await service.updateProfile(1, { province_id: 0, ward_id: -1, blood_type_id: 2 });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { user_id: 1 },
      data: expect.objectContaining({ province_id: null, ward_id: null, blood_type_id: 2 }),
    });
  });

  it('UTCID03 omitted phone is cleared (partial update)', async () => {
    await service.updateProfile(1, { avatar_url: 'a.png' });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: { avatar_url: 'a.png', phone: null } });
  });

  it('UTCID04 blank full_name', async () => { await rejects({ full_name: '   ' }, 'Họ và tên không được để trống'); });
  it('UTCID05 full_name too short', async () => { await rejects({ full_name: 'A' }, 'Họ và tên phải có ít nhất 2 ký tự'); });
  it('UTCID06 full_name contains digits', async () => { await rejects({ full_name: 'Nguyen 123' }, 'Họ và tên không được chứa ký tự đặc biệt hoặc số'); });
  it('UTCID07 invalid phone', async () => { await rejects({ phone: '0123456789' }, 'Số điện thoại không hợp lệ (Phải là SĐT Việt Nam'); });

  it('UTCID08 age exactly 18', async () => {
    await service.updateProfile(1, { date_of_birth: '2008-11-03' });
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: expect.objectContaining({ date_of_birth: new Date('2008-11-03') }) });
  });

  it('UTCID09 age 17', async () => { await rejects({ date_of_birth: '2008-11-04' }, 'Người dùng chưa đủ 18 tuổi (17 tuổi).'); });

  it('UTCID10 age 65 allowed', async () => {
    await service.updateProfile(1, { date_of_birth: '1960-11-04' });
    expect(prisma.users.update).toHaveBeenCalled();
  });

  it('UTCID11 age 66', async () => { await rejects({ date_of_birth: '1960-11-03' }, 'Người dùng đã vượt quá độ tuổi cho phép (66 tuổi).'); });
  it('UTCID12 future date of birth', async () => { await rejects({ date_of_birth: '2027-01-01' }, 'Ngày sinh không thể là ngày trong tương lai'); });
});
