import { RequestService } from '../request.service';

describe('REQ-004 RequestService.getRequests', () => {
  let prisma: any, service: RequestService, cron: jest.SpyInstance;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const where = () => prisma.blood_requests.findMany.mock.calls[0][0].where;
  const orderBy = () => prisma.blood_requests.findMany.mock.calls[0][0].orderBy;

  beforeEach(() => {
    prisma = {
      blood_requests: {
        findMany: jest.fn().mockResolvedValue([{ request_id: 1, request_code: 'RQ-1' }, { request_id: 2, request_code: 'RQ-2' }]),
        count: jest.fn().mockResolvedValue(2),
      },
      donor_availability_slots: { count: jest.fn().mockResolvedValue(1) },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
    cron = jest.spyOn(service, 'handleCronCloseExpiredRequests').mockResolvedValue(undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('UTCID01 default list', async () => {
    const res = await service.getRequests({}, admin);
    expect(cron).toHaveBeenCalledTimes(1);
    expect(res.data).toHaveLength(2);
    expect(res.data.every((r: any) => r.registered_donors_count === 1)).toBe(true);
    expect(res.meta).toEqual(expect.objectContaining({ total: 2, page: 1 }));
    expect(orderBy()).toEqual([
      { urgency: { priority_level: 'desc' } },
      { status: { sort_order: 'asc' } },
      { created_at: 'desc' },
    ]);
  });

  it('UTCID02 staff scoped to own facility', async () => {
    prisma.blood_requests.findMany.mockResolvedValue([]);
    prisma.blood_requests.count.mockResolvedValue(0);
    const res = await service.getRequests({ facility_id: '3' }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(where().facility_id).toBe(1);
  });

  it('UTCID03 staff without facility', async () => {
    prisma.blood_requests.findMany.mockResolvedValue([]);
    prisma.blood_requests.count.mockResolvedValue(0);
    const res = await service.getRequests({}, { user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null });
    expect(res.meta.total).toBe(0);
    expect(where().facility_id).toBe(-1);
  });

  it('UTCID04 filters without user', async () => {
    await service.getRequests({ status_id: '2', urgency_id: '1', requester_user_id: '9', search: 'An', facility_id: '3' }, undefined);
    expect(where()).toEqual({
      status_id: 2, facility_id: 3, urgency_id: 1, requester_user_id: 9, patient_name: { contains: 'An' },
    });
  });

  it('UTCID05 public view', async () => {
    await service.getRequests({ is_public_view: 'true' }, undefined);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(where().OR).toEqual([{ required_before: { gte: today } }, { required_before: null }]);
    expect(where().status).toEqual({ status_code: { notIn: ['COMPLETED', 'CANCELLED', 'CLOSED', 'REJECTED'] } });
  });

  it('UTCID06 sort urgency asc', async () => {
    await service.getRequests({ sortBy: 'urgency', sortOrder: 'asc' }, admin);
    expect(orderBy()).toEqual([{ urgency: { priority_level: 'asc' } }, { created_at: 'desc' }]);
  });

  it('UTCID07 sort status default order', async () => {
    await service.getRequests({ sortBy: 'status' }, admin);
    expect(orderBy()).toEqual([{ status: { sort_order: 'desc' } }, { created_at: 'desc' }]);
  });

  it('UTCID08 sort created_at asc', async () => {
    await service.getRequests({ sortBy: 'created_at', sortOrder: 'asc' }, admin);
    expect(orderBy()).toEqual([{ created_at: 'asc' }]);
  });

  it('UTCID09 unknown sortBy', async () => {
    await service.getRequests({ sortBy: 'foo' }, admin);
    expect(orderBy()).toEqual([{ created_at: 'desc' }]);
  });

  it('UTCID10 pagination page 3', async () => {
    prisma.blood_requests.count.mockResolvedValue(45);
    const res = await service.getRequests({ page: '3', limit: '20' }, admin);
    expect(res.meta).toEqual(expect.objectContaining({ page: 3, totalPages: 3 }));
    expect(prisma.blood_requests.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
  });

  it('UTCID11 auto-close rejects', async () => {
    cron.mockRejectedValue(new Error('cron fail'));
    const res = await service.getRequests({}, admin);
    expect(res.data).toHaveLength(2);
    expect(prisma.blood_requests.findMany).toHaveBeenCalled();
  });
});
