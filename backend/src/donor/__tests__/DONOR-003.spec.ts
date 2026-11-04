import { makeDonor, D } from './helpers';

describe('DONOR-003 DonorService.getDonationHistory', () => {
  let s: ReturnType<typeof makeDonor>;
  const facility = { facility_id: 1, facility_name: 'BV' };
  const slot = (o: any) => ({ slot_id: 7, status: 'COMPLETED', specific_date: null, notes: null, schedule: { date: D('2026-10-01T00:00:00Z'), facility_id: 1, facility }, ...o });
  const don = (o: any) => ({ donation_id: 100, donation_date: D('2026-10-01T00:00:00Z'), volume_ml: 350, status_code: 'COMPLETED', facility_id: 1, facility, result_notes: 'ok', ...o });
  beforeEach(() => { s = makeDonor(); s.prisma.donor_availability_slots.findMany.mockResolvedValue([]); s.prisma.donations.findMany.mockResolvedValue([]); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 slot matched with donation', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({})]);
    s.prisma.donations.findMany.mockResolvedValue([don({})]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ donation_id: 100, volume_ml: 350, status: 'COMPLETED' });
    expect(s.prisma.donor_availability_slots.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 5 } }));
    expect(s.prisma.donations.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { donor_user_id: 5 } }));
  });

  it('UTCID02 cancelled slot, no donation', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({ status: 'CANCELLED' })]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ donation_id: 7, volume_ml: 0, status: 'CANCELLED' });
  });

  it('UTCID03 walk-in donation', async () => {
    s.prisma.donations.findMany.mockResolvedValue([don({ donation_date: D('2026-09-01T00:00:00Z') })]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ status: 'COMPLETED', notes: 'ok', donation_id: 100 });
  });

  it('UTCID04 nothing', async () => {
    expect(await s.service.getDonationHistory(5)).toEqual([]);
  });

  it('UTCID05 matched by specific_date', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({ specific_date: D('2026-10-05T00:00:00Z') })]);
    s.prisma.donations.findMany.mockResolvedValue([don({ donation_date: D('2026-10-05T00:00:00Z') })]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(1);
    expect(r[0].donation_id).toBe(100);
  });

  it('UTCID06 one day apart is not matched', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({})]);
    s.prisma.donations.findMany.mockResolvedValue([don({ donation_date: D('2026-10-02T00:00:00Z') })]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ donation_id: 100, volume_ml: 350 });
    expect(r[1]).toMatchObject({ donation_id: 7, volume_ml: 0 });
  });

  it('UTCID07 slot without date sorted last', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({ schedule: null })]);
    s.prisma.donations.findMany.mockResolvedValue([don({ donation_date: D('2026-10-02T00:00:00Z') })]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(2);
    expect(r[0].donation_id).toBe(100);
    expect(r[1].donation_id).toBe(7);
    expect(r[1].donation_date).toBeUndefined();
  });

  it('UTCID08 one donation must not be duplicated across two slots (defect)', async () => {
    s.prisma.donor_availability_slots.findMany.mockResolvedValue([slot({ slot_id: 7, status: 'COMPLETED' }), slot({ slot_id: 8, status: 'CANCELLED' })]);
    s.prisma.donations.findMany.mockResolvedValue([don({})]);
    const r = await s.service.getDonationHistory(5);
    expect(r).toHaveLength(2);
    // SRS: a donation is attributed to only one slot (total volume 350, not 700)
    expect(r.filter((x: any) => x.volume_ml === 350)).toHaveLength(1);
  });
});
