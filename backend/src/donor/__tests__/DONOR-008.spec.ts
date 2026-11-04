import { NotFoundException } from '@nestjs/common';
import { makeDonor, D } from './helpers';

describe('DONOR-008 DonorService.getDonorProfile', () => {
  let s: ReturnType<typeof makeDonor>;
  const profile = (o: any = {}) => ({ user_id: 5, next_eligible_date: null, ...o });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    s = makeDonor();
    s.prisma.donor_profiles.update.mockResolvedValue({});
    s.prisma.donations.findFirst.mockResolvedValue(null);
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('UTCID01 no donation, no date', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile());
    const r = await s.service.getDonorProfile(5);
    expect(r).toMatchObject({ user_id: 5, next_eligible_date: null, days_until_next_donation: 0, is_eligible: true });
    expect(s.prisma.donor_profiles.update).not.toHaveBeenCalled();
  });

  it('UTCID02 profile not found', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(null);
    const p = s.service.getDonorProfile(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Hồ sơ không tồn tại');
    expect(s.prisma.donations.findFirst).not.toHaveBeenCalled();
  });

  it('UTCID03 next eligible in 10 days', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-11-13') }));
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: D('2026-11-13'), donation_date: D('2026-08-01') });
    const r = await s.service.getDonorProfile(5);
    expect(r.is_eligible).toBe(false);
    expect(r.days_until_next_donation).toBe(10);
    expect(s.prisma.donor_profiles.update).not.toHaveBeenCalled();
  });

  it('UTCID04 eligible today', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-11-03') }));
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: D('2026-11-03'), donation_date: D('2026-08-01') });
    const r = await s.service.getDonorProfile(5);
    expect(r.is_eligible).toBe(true);
    expect(r.days_until_next_donation).toBe(0);
  });

  it('UTCID05 eligible tomorrow', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-11-04') }));
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: D('2026-11-04'), donation_date: D('2026-08-01') });
    const r = await s.service.getDonorProfile(5);
    expect(r.is_eligible).toBe(false);
    expect(r.days_until_next_donation).toBe(1);
  });

  it('UTCID06 donation without next date -> +84 days', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile());
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: null, donation_date: D('2026-10-04') });
    const r = await s.service.getDonorProfile(5);
    expect(r.next_eligible_date!.toISOString().slice(0, 10)).toBe('2026-12-27');
    expect(r.is_eligible).toBe(false);
    expect(r.days_until_next_donation).toBe(54);
  });

  it('UTCID07 only profile date', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-11-20') }));
    const r = await s.service.getDonorProfile(5);
    expect(r.next_eligible_date!.toISOString().slice(0, 10)).toBe('2026-11-20');
    expect(r.is_eligible).toBe(false);
    expect(r.days_until_next_donation).toBe(17);
    expect(s.prisma.donor_profiles.update).not.toHaveBeenCalled();
  });

  it('UTCID08 self-heal sync', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-12-01') }));
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: D('2026-11-13'), donation_date: D('2026-08-01') });
    const r = await s.service.getDonorProfile(5);
    expect(r.next_eligible_date!.toISOString().slice(0, 10)).toBe('2026-11-13');
    expect(s.prisma.donor_profiles.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: { next_eligible_date: D('2026-11-13') } });
  });

  it('UTCID09 update failure swallowed', async () => {
    s.prisma.donor_profiles.findUnique.mockResolvedValue(profile({ next_eligible_date: D('2026-12-01') }));
    s.prisma.donations.findFirst.mockResolvedValue({ next_eligible_date: D('2026-11-13'), donation_date: D('2026-08-01') });
    s.prisma.donor_profiles.update.mockRejectedValue(new Error('db'));
    const r = await s.service.getDonorProfile(5);
    expect(r.user_id).toBe(5);
  });
});
