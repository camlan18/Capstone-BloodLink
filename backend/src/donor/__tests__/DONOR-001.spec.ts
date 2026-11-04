import { BadRequestException } from '@nestjs/common';
import { makeDonor } from './helpers';

describe('DONOR-001 DonorService.registerDonorProfile', () => {
  let s: ReturnType<typeof makeDonor>;
  beforeEach(() => { s = makeDonor(); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 creates profile and flags user', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    const row = { donor_id: 1, user_id: 5 };
    s.prisma.donor_profiles.create.mockResolvedValue(row);
    const r = await s.service.registerDonorProfile(5, { blood_type_id: 1, weight_kg: 60, emergency_contact_phone: '0987654321' });
    expect(r).toBe(row);
    expect(s.prisma.donor_profiles.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 5, blood_type_id: 1 }) });
    expect(s.prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { is_donor_registered: true, blood_type_id: 1 } });
  });

  it('UTCID02 optional fields undefined', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    s.prisma.donor_profiles.create.mockResolvedValue({ user_id: 5 });
    const r = await s.service.registerDonorProfile(5, { blood_type_id: 1, weight_kg: undefined, emergency_contact_phone: undefined });
    expect(r).toEqual({ user_id: 5 });
    expect(s.prisma.donor_profiles.create).toHaveBeenCalledTimes(1);
    expect(s.prisma.users.update).toHaveBeenCalledTimes(1);
  });

  it('UTCID03 existing profile throws', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue({ user_id: 5 });
    const p = s.service.registerDonorProfile(5, { blood_type_id: 1, weight_kg: 60, emergency_contact_phone: '0987654321' });
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Hồ sơ hiến máu đã tồn tại');
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.prisma.donor_profiles.create).not.toHaveBeenCalled();
  });

  it('UTCID04 invalid blood_type_id should be a 400 BadRequest (SRS)', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    s.prisma.donor_profiles.create.mockRejectedValue(Object.assign(new Error('FK'), { code: 'P2003' }));
    // SRS: service validates blood_type_id and answers 400; actual: raw Prisma error propagates (-> 500)
    await expect(s.service.registerDonorProfile(5, { blood_type_id: 999, weight_kg: 60, emergency_contact_phone: '0987654321' }))
      .rejects.toThrow(BadRequestException);
    expect(s.prisma.users.update).not.toHaveBeenCalled();
  });
});
