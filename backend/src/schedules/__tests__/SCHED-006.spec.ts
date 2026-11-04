import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-006 SchedulesService.updateDonorStatus', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const sched = () => s.prisma.facility_donation_schedules.findFirst;
  const slots = () => s.prisma.donor_availability_slots;
  const msg = 'Lịch hiến máu không tồn tại hoặc bạn không có quyền xem';
  beforeEach(() => {
    s = makeSched();
    sched().mockResolvedValue({ schedule_id: 1 });
    slots().findUnique.mockResolvedValue({ slot_id: 1, schedule_id: 1, user_id: 5, status: 'CONFIRMED' });
    slots().update.mockImplementation(async (a: any) => ({ slot_id: 1, user_id: 5, ...a.data }));
  });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 updates and notifies', async () => {
    const r = await s.service.updateDonorStatus(1, 1, 'ARRIVED', admin);
    expect(r).toMatchObject({ status: 'ARRIVED' });
    expect(slots().update).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: { status: 'ARRIVED' } });
    expect(s.notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [5], reference_type: 'SLOT' }));
  });

  it('UTCID02 schedule not found', async () => {
    sched().mockResolvedValue(null);
    const p = s.service.updateDonorStatus(999, 1, 'ARRIVED', admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(slots().findUnique).not.toHaveBeenCalled();
  });

  it('UTCID03 staff other facility', async () => {
    sched().mockResolvedValue(null);
    const p = s.service.updateDonorStatus(2, 1, 'ARRIVED', { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(slots().update).not.toHaveBeenCalled();
  });

  it('UTCID04 slot not found', async () => {
    slots().findUnique.mockResolvedValue(null);
    const p = s.service.updateDonorStatus(1, 999, 'ARRIVED', admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông tin đăng ký');
    expect(slots().update).not.toHaveBeenCalled();
  });

  it('UTCID05 slot of another schedule', async () => {
    slots().findUnique.mockResolvedValue({ slot_id: 3, schedule_id: 2, user_id: 5 });
    const p = s.service.updateDonorStatus(1, 3, 'ARRIVED', admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy thông tin đăng ký');
    expect(slots().update).not.toHaveBeenCalled();
  });

  it('UTCID06 cancel must release capacity and deactivate slot (defect)', async () => {
    const r = await s.service.updateDonorStatus(1, 1, 'CANCELLED', admin);
    expect(r).toMatchObject({ status: 'CANCELLED' });
    // SRS: consistent with DonorService.updateSlotStatus -> decrement current_donors, is_active false
    expect(s.prisma.facility_donation_schedules.update).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { decrement: 1 } } });
    expect(slots().update).toHaveBeenCalledWith({ where: { slot_id: 1 }, data: expect.objectContaining({ is_active: false }) });
  });

  it('UTCID07 undefined status must be rejected (defect)', async () => {
    await expect(s.service.updateDonorStatus(1, 1, undefined as any, admin)).rejects.toThrow(BadRequestException);
    expect(slots().update).not.toHaveBeenCalled();
  });
});
