import { ValidationPipe, BadRequestException as DtoBadRequest } from '@nestjs/common';
import { CreateScheduleDto } from '../dto/schedules.dto';
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

  // --- DTO validation: CreateScheduleDto via ValidationPipe({ whitelist: true, transform: true }) ---
  const vPipe = new ValidationPipe({ whitelist: true, transform: true });
  const vRun = (v: any) => vPipe.transform(v, { type: 'body', metatype: CreateScheduleDto, data: '' });
  const vBase = { facility_id: 1, date: '2026-11-20', start_time: '08:00', end_time: '11:30', max_donors: 30 };
  const vBad = async (v: any, msg: string) => {
    await expect(vRun(v)).rejects.toBeInstanceOf(DtoBadRequest);
    const err = await vRun(v).catch((e: any) => e);
    expect(err.getResponse().message).toContain(msg);
  };

  it('UTCID10 facility_id empty', async () => {
    await vBad({ ...vBase, facility_id: '' }, 'facility_id should not be empty');
  });

  it('UTCID11 facility_id string rejected', async () => {
    await vBad({ ...vBase, facility_id: '1' }, 'facility_id must be an integer number');
  });

  it('UTCID12 date empty', async () => {
    await vBad({ ...vBase, date: '' }, 'date should not be empty');
  });

  it('UTCID13 date not ISO', async () => {
    await vBad({ ...vBase, date: '20/11/2026' }, 'date must be a valid ISO 8601 date string');
  });

  it('UTCID14 start_time empty', async () => {
    await vBad({ ...vBase, start_time: '' }, 'start_time should not be empty');
  });

  it('UTCID15 start_time not a string', async () => {
    await vBad({ ...vBase, start_time: 800 }, 'start_time must be a string');
  });

  it('UTCID16 end_time empty', async () => {
    await vBad({ ...vBase, end_time: '' }, 'end_time should not be empty');
  });

  it('UTCID17 end_time not a string', async () => {
    await vBad({ ...vBase, end_time: 1130 }, 'end_time must be a string');
  });

  it('UTCID18 max_donors not integer', async () => {
    await vBad({ ...vBase, max_donors: '30' }, 'max_donors must be an integer number');
  });

  it('UTCID19 max_donors negative (defect)', async () => {
    // expected: max_donors must not be less than 1
    await expect(vRun({ ...vBase, max_donors: -1 })).rejects.toBeInstanceOf(DtoBadRequest);
  });

  it('UTCID20 unknown properties stripped', async () => {
    const r: any = await vRun({ ...vBase, current_donors: 99, schedule_id: 5 });
    expect(r).toBeInstanceOf(CreateScheduleDto);
    expect(r).not.toHaveProperty('current_donors');
    expect(r).not.toHaveProperty('schedule_id');
    expect(r).toEqual(expect.objectContaining(vBase));
  });
});
