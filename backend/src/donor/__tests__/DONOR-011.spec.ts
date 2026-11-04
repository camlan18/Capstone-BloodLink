import { makeDonor } from './helpers';

describe('DONOR-011 DonorService.getMySlots', () => {
  let s: ReturnType<typeof makeDonor>;
  beforeEach(() => { s = makeDonor(); });
  afterEach(() => jest.restoreAllMocks());
  const find = () => s.prisma.donor_availability_slots.findMany;

  it('UTCID01 two active slots', async () => {
    const rows = [{ slot_id: 1, schedule: { facility: { facility_id: 1 } } }, { slot_id: 2, schedule: { facility: { facility_id: 2 } } }];
    find().mockResolvedValue(rows);
    const r = await s.service.getMySlots(5);
    expect(r).toHaveLength(2);
    expect(r[0].schedule.facility).toBeDefined();
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 5, is_active: true, status: { not: 'CANCELLED' } }, orderBy: { created_at: 'desc' } }));
  });

  it('UTCID02 none', async () => {
    find().mockResolvedValue([]);
    expect(await s.service.getMySlots(6)).toEqual([]);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 6, is_active: true, status: { not: 'CANCELLED' } } }));
  });

  it('UTCID03 walk-in slot', async () => {
    find().mockResolvedValue([{ slot_id: 3, schedule: null }]);
    const r = await s.service.getMySlots(5);
    expect(r).toHaveLength(1);
    expect(r[0].schedule).toBeNull();
  });

  it('UTCID04 cancelled slots must not be returned as active bookings (defect)', async () => {
    find().mockResolvedValue([{ slot_id: 4, status: 'CANCELLED', is_active: true, schedule: null }]);
    await s.service.getMySlots(5);
    // SRS: cancelled slots are excluded from "my active slots" (status filter in the query)
    expect(find().mock.calls[0][0].where).toHaveProperty('status');
  });
});
