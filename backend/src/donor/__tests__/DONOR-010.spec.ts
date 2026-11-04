import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeDonor } from './helpers';

describe('DONOR-010 DonorService.cancelDonationSlot', () => {
  let s: ReturnType<typeof makeDonor>;
  const NOW = new Date('2026-11-03T00:00:00Z');
  const DAY = 86400000;
  const slotAt = (offsetDays: number) => ({ slot_id: 1, schedule_id: 1, user_id: 5, schedule: { schedule_id: 1, date: new Date(NOW.getTime() + offsetDays * DAY) } });
  beforeEach(() => { jest.useFakeTimers().setSystemTime(NOW); s = makeDonor(); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const msg = 'Chỉ được phép hủy lịch trước ngày hiến máu ít nhất 2 ngày.';

  it('UTCID01 cancel 5 days ahead', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(slotAt(5));
    const r = await s.service.cancelDonationSlot(5, 1);
    expect(r).toEqual({ message: 'Đã hủy lịch thành công' });
    expect(s.prisma.donor_availability_slots.update).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: { status: 'CANCELLED', is_active: false } });
    expect(s.prisma.facility_donation_schedules.update).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { decrement: 1 } } });
    expect(s.notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ notification_type: 'WARNING' }));
  });

  it('UTCID02 slot not found', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(null);
    const p = s.service.cancelDonationSlot(5, 999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông tin đăng ký lịch này');
    expect(s.prisma.donor_availability_slots.update).not.toHaveBeenCalled();
  });

  it('UTCID03 walk-in slot (no schedule)', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue({ slot_id: 2, schedule: null, schedule_id: null });
    const p = s.service.cancelDonationSlot(5, 2);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông tin đăng ký lịch này');
    expect(s.prisma.donor_availability_slots.update).not.toHaveBeenCalled();
  });

  it('UTCID04 exactly 2.0 days', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(slotAt(2));
    const p = s.service.cancelDonationSlot(5, 1);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(s.prisma.donor_availability_slots.update).not.toHaveBeenCalled();
  });

  it('UTCID05 2.1 days', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(slotAt(2.1));
    const r = await s.service.cancelDonationSlot(5, 1);
    expect(r.message).toBe('Đã hủy lịch thành công');
    expect(s.prisma.donor_availability_slots.update).toHaveBeenCalled();
    expect(s.prisma.facility_donation_schedules.update).toHaveBeenCalled();
  });

  it('UTCID06 1.9 days', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(slotAt(1.9));
    const p = s.service.cancelDonationSlot(5, 1);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(s.prisma.donor_availability_slots.update).not.toHaveBeenCalled();
  });

  it('UTCID07 past schedule', async () => {
    s.prisma.donor_availability_slots.findFirst.mockResolvedValue(slotAt(-1));
    const p = s.service.cancelDonationSlot(5, 1);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(s.prisma.donor_availability_slots.update).not.toHaveBeenCalled();
  });
});
