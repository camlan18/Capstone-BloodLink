import { NotFoundException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-002 SchedulesService.getScheduleById', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const msg = 'Lịch hiến máu không tồn tại hoặc bạn không có quyền xem';
  const find = () => s.prisma.facility_donation_schedules.findFirst;
  beforeEach(() => { s = makeSched(); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 admin finds schedule', async () => {
    const row = { schedule_id: 1, facility: {} };
    find().mockResolvedValue(row);
    expect(await s.service.getScheduleById(1, admin)).toBe(row);
    expect(find()).toHaveBeenCalledWith({ where: { schedule_id: 1 }, include: { facility: true } });
  });

  it('UTCID02 not found', async () => {
    find().mockResolvedValue(null);
    const p = s.service.getScheduleById(999, admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
  });

  it('UTCID03 staff own facility', async () => {
    const row = { schedule_id: 1, facility_id: 1 };
    find().mockResolvedValue(row);
    expect(await s.service.getScheduleById(1, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 })).toBe(row);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { schedule_id: 1, facility_id: 1 } }));
  });

  it('UTCID04 staff other facility', async () => {
    find().mockResolvedValue(null);
    const p = s.service.getScheduleById(2, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { schedule_id: 2, facility_id: 1 } }));
  });

  it('UTCID05 staff without facility', async () => {
    const p = s.service.getScheduleById(1, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow(msg);
    expect(find()).not.toHaveBeenCalled();
  });

  it('UTCID06 STAFF role unscoped', async () => {
    const row = { schedule_id: 2, facility_id: 2 };
    find().mockResolvedValue(row);
    expect(await s.service.getScheduleById(2, { user_id: 4, role_code: 'STAFF' })).toBe(row);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: { schedule_id: 2 } }));
  });
});
