import { BadRequestException } from '@nestjs/common';
import { makeDonor } from './helpers';

describe('DONOR-005 DonorService.createAdminSlot', () => {
  let s: ReturnType<typeof makeDonor>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const staff = { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  beforeEach(() => { s = makeDonor(); s.prisma.donor_availability_slots.create.mockImplementation(async (a: any) => ({ slot_id: 1, ...a.data })); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 admin with schedule', async () => {
    s.prisma.facility_donation_schedules.findUnique.mockResolvedValue({ schedule_id: 1, facility_id: 1, current_donors: 0, max_donors: 50, status: 'OPEN' });
    const r = await s.service.createAdminSlot({ user_id: '5', schedule_id: '1' }, admin);
    expect(r).toMatchObject({ slot_id: 1 });
    expect(s.prisma.donor_availability_slots.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 5, schedule_id: 1, specific_date: null, status: 'PENDING' }) });
    expect(s.prisma.facility_donation_schedules.update).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { increment: 1 } } });
  });

  it('UTCID02 admin walk-in with specific_date', async () => {
    const r = await s.service.createAdminSlot({ user_id: '5', specific_date: '2026-11-10' }, admin);
    expect(r).toBeDefined();
    const data = s.prisma.donor_availability_slots.create.mock.calls[0][0].data;
    expect(data.schedule_id).toBeUndefined();
    expect(data.specific_date).toBeInstanceOf(Date);
    expect(s.prisma.facility_donation_schedules.update).not.toHaveBeenCalled();
  });

  it('UTCID03 staff own facility schedule', async () => {
    s.prisma.facility_donation_schedules.findUnique.mockResolvedValue({ schedule_id: 1, facility_id: 1, current_donors: 0, max_donors: 50, status: 'OPEN' });
    const r = await s.service.createAdminSlot({ user_id: '5', schedule_id: '1' }, staff);
    expect(r).toBeDefined();
    expect(s.prisma.facility_donation_schedules.findUnique).toHaveBeenCalledWith({ where: { schedule_id: 1 } });
    expect(s.prisma.facility_donation_schedules.update).toHaveBeenCalledWith(expect.objectContaining({ data: { current_donors: { increment: 1 } } }));
  });

  it('UTCID04 staff other facility', async () => {
    s.prisma.facility_donation_schedules.findUnique.mockResolvedValue({ schedule_id: 2, facility_id: 2 });
    const p = s.service.createAdminSlot({ user_id: '5', schedule_id: '2' }, staff);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền đăng ký cho lịch của cơ sở khác');
    expect(s.prisma.donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID05 staff schedule not found', async () => {
    s.prisma.facility_donation_schedules.findUnique.mockResolvedValue(null);
    const p = s.service.createAdminSlot({ user_id: '5', schedule_id: '999' }, staff);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền đăng ký cho lịch của cơ sở khác');
    expect(s.prisma.donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID06 staff without schedule', async () => {
    const p = s.service.createAdminSlot({ user_id: '5', specific_date: '2026-11-10' }, staff);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Nhân viên y tế cần chọn lịch hiến máu cụ thể');
    expect(s.prisma.facility_donation_schedules.findUnique).not.toHaveBeenCalled();
    expect(s.prisma.donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID07 full schedule must not be overbooked (defect)', async () => {
    s.prisma.facility_donation_schedules.findUnique.mockResolvedValue({ schedule_id: 1, facility_id: 1, current_donors: 50, max_donors: 50, status: 'CLOSED' });
    // SRS: capacity / OPEN status checks like bookDonationSlot -> BadRequestException
    await expect(s.service.createAdminSlot({ user_id: '5', schedule_id: '1' }, admin)).rejects.toThrow(BadRequestException);
    expect(s.prisma.donor_availability_slots.create).not.toHaveBeenCalled();
  });
});
