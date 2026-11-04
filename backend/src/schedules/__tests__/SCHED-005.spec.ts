import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-005 SchedulesService.deleteSchedule', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const find = () => s.prisma.facility_donation_schedules.findFirst;
  const del = () => s.prisma.facility_donation_schedules.delete;
  const row = (n: number) => ({ schedule_id: 1, _count: { donor_availability_slots: n } });
  beforeEach(() => { s = makeSched(); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 admin deletes empty schedule', async () => {
    find().mockResolvedValue(row(0));
    expect(await s.service.deleteSchedule(1, admin)).toEqual({ message: 'Xóa lịch hiến máu thành công' });
    expect(del()).toHaveBeenCalledWith({ where: { schedule_id: 1 } });
  });

  it('UTCID02 not found', async () => {
    find().mockResolvedValue(null);
    const p = s.service.deleteSchedule(999, admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại');
    expect(del()).not.toHaveBeenCalled();
  });

  it('UTCID03 has slots', async () => {
    find().mockResolvedValue(row(1));
    const p = s.service.deleteSchedule(1, admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Không thể xóa lịch này vì đã có người đăng ký hoặc slot');
    expect(del()).not.toHaveBeenCalled();
  });

  it('UTCID04 staff without facility', async () => {
    const p = s.service.deleteSchedule(1, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại');
    expect(find()).not.toHaveBeenCalled();
  });

  it('UTCID05 staff other facility', async () => {
    find().mockResolvedValue(null);
    const p = s.service.deleteSchedule(2, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại');
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { schedule_id: 2, facility_id: 1 } }));
  });

  it('UTCID06 staff deletes own empty schedule', async () => {
    find().mockResolvedValue(row(0));
    expect(await s.service.deleteSchedule(1, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 })).toEqual({ message: 'Xóa lịch hiến máu thành công' });
    expect(del()).toHaveBeenCalled();
  });
});
