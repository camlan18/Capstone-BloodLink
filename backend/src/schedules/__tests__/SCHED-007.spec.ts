import { NotFoundException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-007 SchedulesService.getScheduleDonors', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const find = () => s.prisma.donor_availability_slots.findMany;
  const msg = 'Lịch hiến máu không tồn tại hoặc bạn không có quyền xem';
  beforeEach(() => {
    s = makeSched();
    s.prisma.facility_donation_schedules.findFirst.mockResolvedValue({ schedule_id: 1 });
    find().mockResolvedValue([]);
    s.prisma.donor_availability_slots.count.mockResolvedValue(0);
  });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 default list', async () => {
    find().mockResolvedValue([{}, {}]);
    s.prisma.donor_availability_slots.count.mockResolvedValue(2);
    const r = await s.service.getScheduleDonors(1, {}, admin);
    expect(r.data).toHaveLength(2);
    expect(r.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { schedule_id: 1 }, skip: 0, take: 20, orderBy: { created_at: 'asc' } }));
  });

  it('UTCID02 status filter', async () => {
    await s.service.getScheduleDonors(1, { status: 'PENDING' }, admin);
    expect(find().mock.calls[0][0].where).toEqual({ schedule_id: 1, status: 'PENDING' });
  });

  it('UTCID03 status all', async () => {
    await s.service.getScheduleDonors(1, { status: 'all' }, admin);
    expect(find().mock.calls[0][0].where).toEqual({ schedule_id: 1 });
  });

  it('UTCID04 pagination', async () => {
    s.prisma.donor_availability_slots.count.mockResolvedValue(12);
    const r = await s.service.getScheduleDonors(1, { page: '2', limit: '5' }, admin);
    expect(r.meta).toEqual({ total: 12, page: 2, limit: 5, totalPages: 3 });
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });

  it('UTCID05 non-numeric page', async () => {
    const r = await s.service.getScheduleDonors(1, { page: 'abc' }, admin);
    expect(r.meta.page).toBe(1);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it('UTCID06 schedule not found', async () => {
    s.prisma.facility_donation_schedules.findFirst.mockResolvedValue(null);
    const p = s.service.getScheduleDonors(999, {}, admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(find()).not.toHaveBeenCalled();
  });

  it('UTCID07 staff without facility', async () => {
    const p = s.service.getScheduleDonors(1, {}, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(s.prisma.facility_donation_schedules.findFirst).not.toHaveBeenCalled();
  });
});
