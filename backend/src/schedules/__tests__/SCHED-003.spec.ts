import { BadRequestException } from '@nestjs/common';
import { makeSched } from './helpers';

describe('SCHED-003 SchedulesService.createSchedule', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const dto = (o: any = {}) => ({ facility_id: 1, date: '2026-11-20', start_time: '08:00', end_time: '11:30', max_donors: 30, ...o } as any);
  const create = () => s.prisma.facility_donation_schedules.create;
  const msg = 'Giờ kết thúc phải lớn hơn giờ bắt đầu trong cùng một ngày';
  beforeEach(() => { s = makeSched(); create().mockImplementation(async (a: any) => ({ schedule_id: 1, ...a.data })); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 creates schedule', async () => {
    const r = await s.service.createSchedule(dto(), admin);
    expect(r).toMatchObject({ schedule_id: 1 });
    expect(create()).toHaveBeenCalledWith({ data: expect.objectContaining({
      facility_id: 1, max_donors: 30, status: 'OPEN',
      start_time: new Date('1970-01-01T08:00:00.000Z'), end_time: new Date('1970-01-01T11:30:00.000Z'),
    }) });
  });

  it('UTCID02 default max_donors 50', async () => {
    await s.service.createSchedule(dto({ max_donors: undefined }), admin);
    expect(create().mock.calls[0][0].data).toMatchObject({ max_donors: 50, status: 'OPEN' });
  });

  it('UTCID03 end before start', async () => {
    const p = s.service.createSchedule(dto({ start_time: '11:00', end_time: '08:00' }), admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(create()).not.toHaveBeenCalled();
  });

  it('UTCID04 end equals start', async () => {
    const p = s.service.createSchedule(dto({ start_time: '08:00', end_time: '08:00' }), admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow(msg);
    expect(create()).not.toHaveBeenCalled();
  });

  it('UTCID05 end one minute after start', async () => {
    await s.service.createSchedule(dto({ start_time: '08:00', end_time: '08:01' }), admin);
    expect(create()).toHaveBeenCalled();
  });

  it('UTCID06 staff facility overrides dto', async () => {
    await s.service.createSchedule(dto({ facility_id: 2 }), { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(create().mock.calls[0][0].data.facility_id).toBe(1);
  });

  it('UTCID07 staff without facility', async () => {
    const p = s.service.createSchedule(dto(), { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn cơ sở y tế');
    expect(create()).not.toHaveBeenCalled();
  });

  it('UTCID08 facility_id 0', async () => {
    const p = s.service.createSchedule(dto({ facility_id: 0 }), admin);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn cơ sở y tế');
    expect(create()).not.toHaveBeenCalled();
  });

  it('UTCID09 "9:00"-"10:00" should be accepted (defect, lexicographic compare)', async () => {
    const r = await s.service.createSchedule(dto({ start_time: '9:00', end_time: '10:00' }), admin);
    expect(r).toBeDefined();
    expect(create()).toHaveBeenCalled();
  });
});
