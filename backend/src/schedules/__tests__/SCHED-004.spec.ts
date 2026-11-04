import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-004 SchedulesService.updateSchedule', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const staff = { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const stored = { schedule_id: 1, facility_id: 1, start_time: new Date('1970-01-01T08:00:00.000Z'), end_time: new Date('1970-01-01T11:00:00.000Z'), current_donors: 10 };
  const find = () => s.prisma.facility_donation_schedules.findFirst;
  const upd = () => s.prisma.facility_donation_schedules.update;
  const msg = 'Giờ kết thúc phải lớn hơn giờ bắt đầu trong cùng một ngày';
  beforeEach(() => { s = makeSched(); find().mockResolvedValue(stored); upd().mockImplementation(async (a: any) => ({ ...stored, ...a.data })); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 max_donors and status only', async () => {
    const r = await s.service.updateSchedule(1, { max_donors: 40, status: 'CLOSED' } as any, admin);
    expect(r).toMatchObject({ max_donors: 40, status: 'CLOSED' });
    expect(upd()).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { max_donors: 40, status: 'CLOSED' } });
  });

  it('UTCID02 not found', async () => {
    find().mockResolvedValue(null);
    const p = s.service.updateSchedule(999, {} as any, admin);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại hoặc bạn không có quyền sửa');
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID03 staff without facility', async () => {
    const p = s.service.updateSchedule(1, {} as any, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại hoặc bạn không có quyền sửa');
    expect(find()).not.toHaveBeenCalled();
  });

  it('UTCID04 staff other facility', async () => {
    find().mockResolvedValue(null);
    const p = s.service.updateSchedule(2, {} as any, staff);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Lịch hiến máu không tồn tại hoặc bạn không có quyền sửa');
    expect(find()).toHaveBeenCalledWith({ where: { schedule_id: 2, facility_id: 1 } });
  });

  it('UTCID05 new start and end', async () => {
    await s.service.updateSchedule(1, { start_time: '07:00', end_time: '10:00' } as any, admin);
    const data = upd().mock.calls[0][0].data;
    expect(data.start_time).toEqual(new Date('1970-01-01T07:00:00.000Z'));
    expect(data.end_time).toEqual(new Date('1970-01-01T10:00:00.000Z'));
  });

  it('UTCID06 start equals end', async () => {
    const p = s.service.updateSchedule(1, { start_time: '10:00', end_time: '10:00' } as any, admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID07 start equals stored end', async () => {
    const p = s.service.updateSchedule(1, { start_time: '11:00' } as any, admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID08 start 10:59', async () => {
    await s.service.updateSchedule(1, { start_time: '10:59' } as any, admin);
    expect(upd().mock.calls[0][0].data).toEqual({ start_time: new Date('1970-01-01T10:59:00.000Z') });
  });

  it('UTCID09 end before stored start', async () => {
    const p = s.service.updateSchedule(1, { end_time: '07:00' } as any, admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(upd()).not.toHaveBeenCalled();
  });

  it('UTCID10 max_donors 0 included', async () => {
    find().mockResolvedValue({ ...stored, current_donors: 0 });
    await s.service.updateSchedule(1, { max_donors: 0 } as any, admin);
    expect(upd()).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { max_donors: 0 } });
  });

  it('UTCID11 staff must not move schedule to another facility (defect)', async () => {
    await s.service.updateSchedule(1, { facility_id: 2 } as any, staff).catch(() => undefined);
    // SRS: HOSPITAL_STAFF is limited to own facility -> the schedule is never reassigned
    expect(upd()).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ facility_id: 2 }) }));
  });

  it('UTCID12 max_donors below current_donors must be rejected (defect)', async () => {
    await expect(s.service.updateSchedule(1, { max_donors: 5 } as any, admin)).rejects.toThrow(BadRequestException);
    expect(upd()).not.toHaveBeenCalled();
  });
});
