import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
jest.mock('bcrypt');

describe('USR-006 UsersService.createUserAdmin', () => {
  let prisma: any, service: UsersService;
  const dto = (o: any = {}) => ({ email: 'new02@test.vn', full_name: 'Nguyen Van A', role_id: 2, password: 'Abc@1234', ...o }) as any;
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma = {
      users: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ user_id: 20, password_hash: 'hashed' }),
      },
      roles: {
        findUnique: jest.fn(async ({ where }: any) =>
          where.role_id === 3 ? { role_id: 3, role_code: 'HOSPITAL_STAFF' } : { role_id: where.role_id, role_code: 'USER' }),
      },
    };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });
  const bad = async (d: any, msg: string) => {
    const p = service.createUserAdmin(d);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(prisma.users.create).not.toHaveBeenCalled();
  };
  const FAC = 'Vai trò Nhân viên bệnh viện bắt buộc phải chọn Cơ sở y tế trực thuộc';

  it('UTCID01 create success with identity card', async () => {
    const res: any = await service.createUserAdmin(dto({ identity_card: '012345678901' }));
    expect(res.user_id).toBe(20);
    expect(res.password_hash).toBeUndefined();
    expect(prisma.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_email_verified: true, is_active: true }) });
    expect((bcrypt.hash as jest.Mock).mock.calls[0][0]).toBe('Abc@1234');
  });

  it('UTCID02 default password', async () => {
    const res: any = await service.createUserAdmin(dto({ password: undefined }));
    expect(res.user_id).toBe(20);
    expect((bcrypt.hash as jest.Mock).mock.calls[0][0]).toBe('Blood@123456');
  });

  it('UTCID03 hospital staff with facility', async () => {
    const res: any = await service.createUserAdmin(dto({ role_id: 3, facility_id: 1 }));
    expect(res.user_id).toBe(20);
    expect(prisma.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID04 hospital staff without facility', async () => { await bad(dto({ role_id: 3 }), FAC); });
  it('UTCID05 hospital staff facility 0', async () => { await bad(dto({ role_id: 3, facility_id: 0 }), FAC); });

  it('UTCID06 email exists', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
    await bad(dto({ email: 'member01@test.vn' }), 'Email đã tồn tại');
  });

  it('UTCID07 identity card exists', async () => {
    prisma.users.findFirst.mockResolvedValue({ user_id: 5 });
    await bad(dto({ identity_card: '012345678901' }), 'CCCD/CMND này đã được đăng ký cho một tài khoản khác');
  });

  it('UTCID08 invalid identity card', async () => {
    await bad(dto({ identity_card: '12345' }), 'CCCD/CMND không hợp lệ (Phải là dãy 9 hoặc 12 chữ số)');
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID09 password too short', async () => {
    await bad(dto({ password: '12345' }), 'Mật khẩu phải có ít nhất 6 ký tự');
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID10 password length 6 ok', async () => {
    const res: any = await service.createUserAdmin(dto({ password: '123456' }));
    expect(res.user_id).toBe(20);
    expect(prisma.users.create).toHaveBeenCalled();
  });

  it('UTCID11 invalid email format', async () => {
    await bad(dto({ email: 'abc' }), 'Định dạng email không hợp lệ');
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID12 with donor profile', async () => {
    const res: any = await service.createUserAdmin(dto({ donor_profile: { weight_kg: 50 } }));
    expect(res.user_id).toBe(20);
    expect(prisma.users.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ donor_profile: { create: expect.objectContaining({ blood_type_id: 1, total_donations: 0 }) } }),
    });
  });

  it('UTCID13 donor weight 41 rejected', async () => {
    await bad(dto({ donor_profile: { weight_kg: 41 } }), 'Cân nặng không hợp lệ');
  });
});
