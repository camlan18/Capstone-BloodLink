import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeDonor } from './helpers';

describe('DONOR-006 DonorService.updateSlotStatus', () => {
  let s: ReturnType<typeof makeDonor>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const staff = { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const slot = (o: any = {}) => ({ slot_id: 1, status: 'PENDING', schedule_id: 1, user_id: 5, schedule: { facility_id: 1 }, ...o });
  beforeEach(() => {
    s = makeDonor();
    s.prisma.donor_availability_slots.update.mockImplementation(async (a: any) => ({ slot_id: a.where.slot_id, user_id: 5, ...a.data }));
  });
  afterEach(() => jest.restoreAllMocks());
  const upd = () => s.prisma.donor_availability_slots.update;
  const sched = () => s.prisma.facility_donation_schedules.update;

  it('UTCID01 confirm with notes', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot());
    const r = await s.service.updateSlotStatus(1, { status: 'CONFIRMED', notes: 'OK' } as any, admin);
    expect(r).toMatchObject({ status: 'CONFIRMED' });
    expect(upd()).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: { status: 'CONFIRMED', notes: 'OK' } });
    expect(s.notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [5], reference_type: 'SLOT' }));
  });

  it('UTCID02 confirm without notes', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot());
    await s.service.updateSlotStatus(1, { status: 'CONFIRMED' } as any, admin);
    expect(upd()).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: { status: 'CONFIRMED' } });
    expect(sched()).not.toHaveBeenCalled();
  });

  it('UTCID03 slot not found', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(null);
    const p = s.service.updateSlotStatus(999, { status: 'CONFIRMED' } as any, admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Slot không tồn tại');
    expect(upd()).not.toHaveBeenCalled();
    expect(s.notifications.createNotification).not.toHaveBeenCalled();
  });

  it('UTCID04 staff own facility', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot());
    const r = await s.service.updateSlotStatus(1, { status: 'CONFIRMED' } as any, staff);
    expect(r).toBeDefined();
    expect(upd()).toHaveBeenCalled();
  });

  it('UTCID05 staff other facility', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ slot_id: 2, schedule: { facility_id: 2 } }));
    const p = s.service.updateSlotStatus(2, { status: 'CONFIRMED' } as any, staff);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền cập nhật slot của cơ sở khác');
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID06 staff on walk-in slot', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ slot_id: 3, schedule: null, schedule_id: null }));
    const p = s.service.updateSlotStatus(3, { status: 'CONFIRMED' } as any, staff);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền cập nhật slot của cơ sở khác');
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID07 cancel decrements', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ status: 'CONFIRMED' }));
    const r = await s.service.updateSlotStatus(1, { status: 'CANCELLED' } as any, admin);
    expect(r).toMatchObject({ status: 'CANCELLED' });
    expect(sched()).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { decrement: 1 } } });
  });

  it('UTCID08 un-cancel increments', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ status: 'CANCELLED' }));
    await s.service.updateSlotStatus(1, { status: 'CONFIRMED' } as any, admin);
    expect(sched()).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { increment: 1 } } });
  });

  it('UTCID09 cancel already cancelled', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ status: 'CANCELLED' }));
    await s.service.updateSlotStatus(1, { status: 'CANCELLED' } as any, admin);
    expect(sched()).not.toHaveBeenCalled();
  });

  it('UTCID10 cancel walk-in', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ slot_id: 3, status: 'CONFIRMED', schedule: null, schedule_id: null }));
    const r = await s.service.updateSlotStatus(3, { status: 'CANCELLED' } as any, admin);
    expect(r).toBeDefined();
    expect(sched()).not.toHaveBeenCalled();
  });

  it('UTCID11 cancel must clear is_active (defect)', async () => {
    s.prisma.donor_availability_slots.findUnique.mockResolvedValue(slot({ status: 'CONFIRMED' }));
    await s.service.updateSlotStatus(1, { status: 'CANCELLED' } as any, admin);
    expect(upd()).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: expect.objectContaining({ status: 'CANCELLED', is_active: false }) });
  });
});
