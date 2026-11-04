import { ValidationPipe, BadRequestException as DtoBadRequest } from '@nestjs/common';
import { PaginationDto } from '../../common/pagination.dto';
import { makeDonor, D } from './helpers';

describe('DONOR-004 DonorService.getSlots', () => {
  let s: ReturnType<typeof makeDonor>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const sl = (id: number, status: string, created = '2026-10-01') => ({ slot_id: id, status, created_at: D(created) });
  const find = () => s.prisma.donor_availability_slots.findMany;
  beforeEach(() => { s = makeDonor(); find().mockResolvedValue([]); s.prisma.donor_availability_slots.count.mockResolvedValue(0); });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 default list with meta', async () => {
    find().mockResolvedValue([sl(1, 'PENDING'), sl(2, 'PENDING'), sl(3, 'PENDING')]);
    s.prisma.donor_availability_slots.count.mockResolvedValue(3);
    const r = await s.service.getSlots({ page: 1, limit: 20 } as any, admin);
    expect(r.data).toHaveLength(3);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    const arg = find().mock.calls[0][0];
    expect(arg.where).toEqual({});
    expect(arg).not.toHaveProperty('skip');
    expect(arg).not.toHaveProperty('take');
    expect(s.prisma.donor_availability_slots.count).toHaveBeenCalledWith({ where: {} });
  });

  it('UTCID02 status priority order', async () => {
    find().mockResolvedValue([sl(1, 'COMPLETED'), sl(2, 'PENDING'), sl(3, 'CONFIRMED')]);
    const r = await s.service.getSlots({ page: 1, limit: 20 } as any, admin);
    expect(r.data.map((x: any) => x.status)).toEqual(['PENDING', 'CONFIRMED', 'COMPLETED']);
  });

  it('UTCID03 same priority newest first', async () => {
    find().mockResolvedValue([sl(1, 'PENDING', '2026-10-01'), sl(2, 'PENDING', '2026-10-05')]);
    const r = await s.service.getSlots({ page: 1, limit: 20 } as any, admin);
    expect(r.data.map((x: any) => x.slot_id)).toEqual([2, 1]);
  });

  it('UTCID04 unknown status priority 99', async () => {
    find().mockResolvedValue([sl(1, 'NO_SHOW'), sl(2, 'CANCELLED')]);
    const r = await s.service.getSlots({ page: 1, limit: 20 } as any, admin);
    expect(r.data.map((x: any) => x.status)).toEqual(['CANCELLED', 'NO_SHOW']);
  });

  it('UTCID05 status and search filter', async () => {
    find().mockResolvedValue([sl(1, 'PENDING')]);
    await s.service.getSlots({ status: 'PENDING', search: 'An' } as any, admin);
    expect(find().mock.calls[0][0].where).toEqual({ status: 'PENDING', user: { full_name: { contains: 'An' } } });
  });

  it('UTCID06 status ALL ignored', async () => {
    await s.service.getSlots({ status: 'ALL' } as any, admin);
    expect(find().mock.calls[0][0].where).not.toHaveProperty('status');
  });

  it('UTCID07 hospital staff scoped to facility', async () => {
    await s.service.getSlots({ page: 1, limit: 20 } as any, { user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(find().mock.calls[0][0].where.schedule).toEqual({ facility_id: 1 });
  });

  it('UTCID08 staff without facility -> -1', async () => {
    const r = await s.service.getSlots({ page: 1, limit: 20 } as any, { user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null });
    expect(r).toEqual({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    expect(find().mock.calls[0][0].where.schedule).toEqual({ facility_id: -1 });
  });

  it('UTCID09 in-memory pagination', async () => {
    find().mockResolvedValue([sl(1, 'PENDING'), sl(2, 'PENDING', '2026-10-02'), sl(3, 'PENDING', '2026-10-03')]);
    s.prisma.donor_availability_slots.count.mockResolvedValue(3);
    const r = await s.service.getSlots({ page: 2, limit: 2 } as any, admin);
    expect(r.data).toHaveLength(1);
    expect(r.meta.totalPages).toBe(2);
    const arg = find().mock.calls[0][0];
    expect(arg).not.toHaveProperty('skip');
    expect(arg).not.toHaveProperty('take');
  });

  it('UTCID10 sortBy created_at asc uses DB paging', async () => {
    await s.service.getSlots({ sortBy: 'created_at', sortOrder: 'asc' } as any, admin);
    expect(find()).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20, orderBy: [{ created_at: 'asc' }] }));
  });

  it('UTCID11 sortBy status', async () => {
    await s.service.getSlots({ sortBy: 'status' } as any, admin);
    expect(find().mock.calls[0][0].orderBy).toEqual([{ status: 'desc' }, { created_at: 'desc' }]);
  });

  it('UTCID12 unknown sortBy fallback', async () => {
    await s.service.getSlots({ sortBy: 'full_name', sortOrder: 'asc' } as any, admin);
    expect(find().mock.calls[0][0].orderBy).toEqual([{ created_at: 'asc' }, { slot_id: 'desc' }]);
  });

  // --- DTO validation: PaginationDto via ValidationPipe({ whitelist: true, transform: true }) ---
  const vPipe = new ValidationPipe({ whitelist: true, transform: true });
  const vRun = (v: any) => vPipe.transform(v, { type: 'query', metatype: PaginationDto, data: '' });
  const vBase = { page: '1', limit: '20' };
  const vBad = async (v: any, msg: string) => {
    await expect(vRun(v)).rejects.toBeInstanceOf(DtoBadRequest);
    const err = await vRun(v).catch((e: any) => e);
    expect(err.getResponse().message).toContain(msg);
  };

  it('UTCID13 page 0 rejected', async () => {
    await vBad({ ...vBase, page: '0' }, 'page must not be less than 1');
  });

  it('UTCID14 page 1 accepted', async () => {
    await expect(vRun({ ...vBase, page: '1' })).resolves.toEqual(expect.objectContaining({ page: 1, limit: 20 }));
  });

  it('UTCID15 limit 0 rejected', async () => {
    await vBad({ ...vBase, limit: '0' }, 'limit must not be less than 1');
  });

  it('UTCID16 limit 1 accepted', async () => {
    await expect(vRun({ ...vBase, limit: '1' })).resolves.toEqual(expect.objectContaining({ page: 1, limit: 1 }));
  });

  it('UTCID17 page not integer', async () => {
    await vBad({ ...vBase, page: 'abc' }, 'page must be an integer number');
  });

  it('UTCID18 sortOrder outside asc/desc', async () => {
    await vBad({ ...vBase, sortOrder: 'up' }, 'sortOrder must be one of the following values: asc, desc');
  });

  it('UTCID19 empty query gets defaults', async () => {
    await expect(vRun({})).resolves.toEqual(expect.objectContaining({ page: 1, limit: 20, sortOrder: 'desc' }));
  });
});
