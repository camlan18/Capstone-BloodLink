import { ValidationPipe, BadRequestException as DtoBadRequest } from '@nestjs/common';
import { ScheduleFilterDto } from '../dto/schedules.dto';
import { makeSched } from './helpers';

describe('SCHED-001 SchedulesService.getAllSchedules', () => {
  let s: ReturnType<typeof makeSched>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const find = () => s.prisma.facility_donation_schedules.findMany;
  beforeEach(() => { s = makeSched(); find().mockResolvedValue([]); s.prisma.facility_donation_schedules.count.mockResolvedValue(0); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 default list', async () => {
    find().mockResolvedValue([{}, {}, {}]);
    s.prisma.facility_donation_schedules.count.mockResolvedValue(3);
    const r = await s.service.getAllSchedules({} as any, admin);
    expect(r.data).toHaveLength(3);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0, take: 20, orderBy: { date: 'desc' } }));
  });

  it('UTCID02 facility filter', async () => {
    await s.service.getAllSchedules({ facility_id: '2' } as any, admin);
    expect(find().mock.calls[0][0].where).toEqual({ facility_id: 2 });
  });

  it('UTCID03 NaN facility ignored', async () => {
    await s.service.getAllSchedules({ facility_id: 'abc' } as any, admin);
    expect(find().mock.calls[0][0].where).toEqual({});
  });

  it('UTCID04 staff forced to own facility', async () => {
    await s.service.getAllSchedules({ facility_id: '2' } as any, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(find().mock.calls[0][0].where).toEqual({ facility_id: 1 });
  });

  it('UTCID05 staff without facility', async () => {
    const r = await s.service.getAllSchedules({} as any, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    expect(r).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    expect(find()).not.toHaveBeenCalled();
    expect(s.prisma.facility_donation_schedules.count).not.toHaveBeenCalled();
  });

  it('UTCID06 status and date filter', async () => {
    await s.service.getAllSchedules({ status: 'OPEN', date: '2026-11-10' } as any, admin);
    expect(find().mock.calls[0][0].where).toEqual({ status: 'OPEN', date: new Date('2026-11-10') });
  });

  it('UTCID07 page 3 of 25', async () => {
    s.prisma.facility_donation_schedules.count.mockResolvedValue(25);
    const r = await s.service.getAllSchedules({ page: 3, limit: 10 } as any, admin);
    expect(r.meta).toEqual({ total: 25, page: 3, limit: 10, totalPages: 3 });
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
  });

  it('UTCID08 empty', async () => {
    const r = await s.service.getAllSchedules({} as any, admin);
    expect(r).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });

  // --- DTO validation: ScheduleFilterDto via ValidationPipe({ whitelist: true, transform: true }) ---
  const vPipe = new ValidationPipe({ whitelist: true, transform: true });
  const vRun = (v: any) => vPipe.transform(v, { type: 'query', metatype: ScheduleFilterDto, data: '' });
  const vBase = {};
  const vBad = async (v: any, msg: string) => {
    await expect(vRun(v)).rejects.toBeInstanceOf(DtoBadRequest);
    const err = await vRun(v).catch((e: any) => e);
    expect(err.getResponse().message).toContain(msg);
  };

  it('UTCID09 date not ISO', async () => {
    await vBad({ ...vBase, date: '20-11-2026' }, 'date must be a valid ISO 8601 date string');
  });

  it('UTCID10 page 0 rejected', async () => {
    await vBad({ ...vBase, page: '0' }, 'page must not be less than 1');
  });

  it('UTCID11 sortOrder outside asc/desc', async () => {
    await vBad({ ...vBase, sortOrder: 'up' }, 'sortOrder must be one of the following values: asc, desc');
  });
});
