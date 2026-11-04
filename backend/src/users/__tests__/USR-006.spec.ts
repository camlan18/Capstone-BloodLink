import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
import { CreateUserAdminDto } from '../dto/users.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { email: 'new02@test.vn', full_name: 'Nguyen Van A', role_id: 2, password: 'Abc@1234' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: CreateUserAdminDto, data: '' });
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

  it('UTCID14 DTO: email empty', async () => {
    const err = await runDto({ ...dtoValid, email: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Email không được để trống");
  });

  it('UTCID15 DTO: email invalid format', async () => {
    const err = await runDto({ ...dtoValid, email: 'new02' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Email không hợp lệ");
  });

  it('UTCID16 DTO: full_name empty', async () => {
    const err = await runDto({ ...dtoValid, full_name: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Họ tên không được để trống");
  });

  it('UTCID17 DTO: full_name 150 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, full_name: 'a'.repeat(150) })).resolves.toEqual(expect.objectContaining({ full_name: 'a'.repeat(150) }));
  });

  it('UTCID18 DTO: full_name 151 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, full_name: 'a'.repeat(151) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("full_name must be shorter than or equal to 150 characters");
  });

  it('UTCID19 DTO: role_id missing', async () => {
    const err = await runDto({ ...dtoValid, role_id: undefined }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Quyền (role_id) không được để trống");
  });

  it('UTCID20 DTO: role_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, role_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("role_id must be an integer number");
  });

  it('UTCID21 DTO: password 5 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, password: '12345' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Mật khẩu phải có ít nhất 6 ký tự");
  });

  it('UTCID22 DTO: password 6 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, password: '123456' })).resolves.toEqual(expect.objectContaining({ password: '123456' }));
  });

  it('UTCID23 DTO: facility_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, facility_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("facility_id must be an integer number");
  });

  it('UTCID24 DTO: username 150 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, username: 'a'.repeat(150) })).resolves.toEqual(expect.objectContaining({ username: 'a'.repeat(150) }));
  });

  it('UTCID25 DTO: username 151 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, username: 'a'.repeat(151) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("username must be shorter than or equal to 150 characters");
  });

  it('UTCID26 DTO: phone 20 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, phone: 'a'.repeat(20) })).resolves.toEqual(expect.objectContaining({ phone: 'a'.repeat(20) }));
  });

  it('UTCID27 DTO: phone 21 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, phone: 'a'.repeat(21) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("phone must be shorter than or equal to 20 characters");
  });

  it('UTCID28 DTO: identity_card 20 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, identity_card: 'a'.repeat(20) })).resolves.toEqual(expect.objectContaining({ identity_card: 'a'.repeat(20) }));
  });

  it('UTCID29 DTO: identity_card 21 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, identity_card: 'a'.repeat(21) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("identity_card must be shorter than or equal to 20 characters");
  });

  it('UTCID30 DTO: address 500 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, address: 'a'.repeat(500) })).resolves.toEqual(expect.objectContaining({ address: 'a'.repeat(500) }));
  });

  it('UTCID31 DTO: address 501 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, address: 'a'.repeat(501) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("address must be shorter than or equal to 500 characters");
  });

  it('UTCID32 DTO: gender not a string', async () => {
    const err = await runDto({ ...dtoValid, gender: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("gender must be a string");
  });

  it('UTCID33 DTO: province_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, province_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("province_id must be an integer number");
  });

  it('UTCID34 DTO: ward_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, ward_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("ward_id must be an integer number");
  });

  it('UTCID35 DTO: blood_type_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, blood_type_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("blood_type_id must be an integer number");
  });

  it('UTCID36 DTO: is_donor_registered not a boolean', async () => {
    const err = await runDto({ ...dtoValid, is_donor_registered: 'yes' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("is_donor_registered must be a boolean value");
  });

  it('UTCID37 DTO: is_available_for_donation not a boolean', async () => {
    const err = await runDto({ ...dtoValid, is_available_for_donation: 'yes' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("is_available_for_donation must be a boolean value");
  });

  it('UTCID38 DTO: is_email_verified not a boolean', async () => {
    const err = await runDto({ ...dtoValid, is_email_verified: 'yes' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("is_email_verified must be a boolean value");
  });

  it('UTCID39 DTO: is_active not a boolean', async () => {
    const err = await runDto({ ...dtoValid, is_active: 'yes' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("is_active must be a boolean value");
  });

  it('UTCID40 DTO: donor_profile nested emergency_contact_phone 21 chars', async () => {
    const err = await runDto({ ...dtoValid, donor_profile: { emergency_contact_phone: 'a'.repeat(21) } }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("donor_profile.emergency_contact_phone must be shorter than or equal to 20 characters");
  });

  it('UTCID41 DTO: unknown property stripped by whitelist', async () => {
    const res = await runDto({ ...dtoValid, password_hash: 'x' });
    expect(res).toEqual(expect.objectContaining(dtoValid));
    expect(res).not.toHaveProperty('password_hash');
  });
});
