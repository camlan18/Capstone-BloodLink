import { ValidationPipe, BadRequestException as DtoBadRequest } from '@nestjs/common';
import { UpdateDonorProfileDto } from '../dto/donor.dto';
import { BadRequestException } from '@nestjs/common';
import { makeDonor } from './helpers';

describe('DONOR-002 DonorService.updateDonorProfile', () => {
  let s: ReturnType<typeof makeDonor>;
  const profile = { user_id: 5, blood_type_id: 1 };
  beforeEach(() => { s = makeDonor(); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 full_name + weight', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile);
    const upd = { ...profile, weight_kg: 65 };
    s.prisma.donor_profiles.update.mockResolvedValue(upd);
    const r = await s.service.updateDonorProfile(5, { full_name: 'Nguyen Van A', weight_kg: 65 } as any);
    expect(r).toEqual({ message: 'Cập nhật hồ sơ thành công', profile: upd });
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { full_name: 'Nguyen Van A' } });
    expect(s.prisma.donor_profiles.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { weight_kg: 65 } });
  });

  it('UTCID02 phone only', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile);
    const r = await s.service.updateDonorProfile(5, { phone_number: '0901234567' } as any);
    expect(r).toEqual({ message: 'Cập nhật hồ sơ thành công', profile });
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { phone: '0901234567' } });
    expect(s.prisma.donor_profiles.update).not.toHaveBeenCalled();
  });

  it('UTCID03 empty dto', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile);
    const r = await s.service.updateDonorProfile(5, {} as any);
    expect(r).toEqual({ message: 'Cập nhật hồ sơ thành công', profile });
    expect(s.prisma.users.update).not.toHaveBeenCalled();
    expect(s.prisma.donor_profiles.update).not.toHaveBeenCalled();
  });

  it('UTCID04 blood_type_id 2', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile);
    s.prisma.donor_profiles.update.mockResolvedValue({ user_id: 5, blood_type_id: 2 });
    const r = await s.service.updateDonorProfile(5, { blood_type_id: 2 } as any);
    expect(r.profile.blood_type_id).toBe(2);
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { blood_type_id: 2 } });
    expect(s.prisma.donor_profiles.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { blood_type_id: 2 } });
  });

  it('UTCID05 date_of_birth null clears DOB', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile);
    const r = await s.service.updateDonorProfile(5, { date_of_birth: null } as any);
    expect(r.message).toBe('Cập nhật hồ sơ thành công');
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { date_of_birth: null } });
  });

  it('UTCID06 creates new profile', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    const created = { user_id: 5, blood_type_id: 1, weight_kg: 65 };
    s.prisma.donor_profiles.create.mockResolvedValue(created);
    const r = await s.service.updateDonorProfile(5, { blood_type_id: 1, weight_kg: 65 } as any);
    expect(r).toEqual({ message: 'Cập nhật hồ sơ thành công', profile: created });
    expect(s.prisma.donor_profiles.create).toHaveBeenCalledWith({ data: { user_id: 5, blood_type_id: 1, weight_kg: 65 } });
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { is_donor_registered: true } });
  });

  it('UTCID07 new profile without blood type throws', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    const p = s.service.updateDonorProfile(5, { weight_kg: 65 } as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn nhóm máu khi tạo hồ sơ lần đầu');
    expect(s.prisma.donor_profiles.create).not.toHaveBeenCalled();
  });

  it('UTCID08 users.update happens before throw', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    const p = s.service.updateDonorProfile(5, { full_name: 'Nguyen Van A' } as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn nhóm máu khi tạo hồ sơ lần đầu');
    expect(s.prisma.users.update).toHaveBeenCalledTimes(1);
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { full_name: 'Nguyen Van A' } });
    expect(s.prisma.donor_profiles.create).not.toHaveBeenCalled();
  });

  // --- DTO validation: UpdateDonorProfileDto via ValidationPipe({ whitelist: true, transform: true }) ---
  const vPipe = new ValidationPipe({ whitelist: true, transform: true });
  const vRun = (v: any) => vPipe.transform(v, { type: 'body', metatype: UpdateDonorProfileDto, data: '' });
  const vBase = { full_name: 'Nguyen Van A', weight_kg: 65 };
  const vBad = async (v: any, msg: string) => {
    await expect(vRun(v)).rejects.toBeInstanceOf(DtoBadRequest);
    const err = await vRun(v).catch((e: any) => e);
    expect(err.getResponse().message).toContain(msg);
  };

  it('UTCID09 full_name 150 chars accepted', async () => {
    await expect(vRun({ ...vBase, full_name: 'a'.repeat(150) })).resolves.toEqual(expect.objectContaining({ full_name: 'a'.repeat(150) }));
  });

  it('UTCID10 full_name 151 chars rejected', async () => {
    await vBad({ ...vBase, full_name: 'a'.repeat(151) }, 'full_name must be shorter than or equal to 150 characters');
  });

  it('UTCID11 full_name not a string', async () => {
    await vBad({ ...vBase, full_name: 123 }, 'full_name must be a string');
  });

  it('UTCID12 phone_number 20 chars accepted', async () => {
    await expect(vRun({ ...vBase, phone_number: '0'.repeat(20) })).resolves.toEqual(expect.objectContaining({ phone_number: '0'.repeat(20) }));
  });

  it('UTCID13 phone_number 21 chars rejected', async () => {
    await vBad({ ...vBase, phone_number: '0'.repeat(21) }, 'phone_number must be shorter than or equal to 20 characters');
  });

  it('UTCID14 date_of_birth not ISO date', async () => {
    await vBad({ ...vBase, date_of_birth: '01/01/1990' }, 'date_of_birth must be a valid ISO 8601 date string');
  });

  it('UTCID15 blood_type_id not integer', async () => {
    await vBad({ ...vBase, blood_type_id: 1.5 }, 'blood_type_id must be an integer number');
  });

  it('UTCID16 weight_kg not a number', async () => {
    await vBad({ ...vBase, weight_kg: 'abc' }, 'weight_kg must be a number conforming to the specified constraints');
  });

  it('UTCID17 gender outside M/F/O', async () => {
    await vBad({ ...vBase, gender: 'X' }, 'gender must be one of the following values: M, F, O');
  });
});
