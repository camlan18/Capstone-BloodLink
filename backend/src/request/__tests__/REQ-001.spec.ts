import { BadRequestException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-001 RequestService.createRequest', () => {
  let prisma: any, tx: any, notif: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const dto = (o: any = {}): any => ({
    patient_name: 'Nguyen Van A', blood_type_id: 1, component_id: 1, units_needed: 2, urgency_id: 1, facility_id: 1, ...o,
  });

  beforeEach(() => {
    tx = {
      blood_request_statuses: { findFirst: jest.fn().mockResolvedValue({ status_id: 1 }) },
      blood_requests: { create: jest.fn().mockResolvedValue({ request_id: 100, request_code: 'RQ-123' }) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    notif = { notifyAdmins: jest.fn().mockResolvedValue(undefined) };
    service = new RequestService(prisma as any, {} as any, notif as any, {} as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('UTCID01 ADMIN creates request', async () => {
    const res = await service.createRequest(dto(), admin);
    expect(res.request_id).toBe(100);
    expect(res.request_code).toMatch(/^RQ-/);
    expect(tx.blood_requests.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status_id: 1, facility_id: 1, requester_user_id: 1, request_code: expect.stringMatching(/^RQ-\d+$/) }),
    });
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ change_reason: 'Tạo yêu cầu mới' }),
    });
    expect(notif.notifyAdmins).toHaveBeenCalledWith('Yêu cầu máu mới', expect.any(String), 'WARNING', 'REQUEST', 100);
  });

  it('UTCID02 staff uses own facility', async () => {
    await service.createRequest(dto({ facility_id: 3 }), { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(tx.blood_requests.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID03 required_before converted to Date', async () => {
    await service.createRequest(dto({ required_before: '2026-11-10' }), admin);
    expect(tx.blood_requests.create.mock.calls[0][0].data.required_before).toEqual(new Date('2026-11-10'));
  });

  it('UTCID04 no facility_id', async () => {
    const p = service.createRequest(dto({ facility_id: undefined }), admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn cơ sở y tế');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID05 staff without facility', async () => {
    await expect(
      service.createRequest(dto(), { user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null }),
    ).rejects.toThrow(new BadRequestException('Vui lòng chọn cơ sở y tế'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID06 pending status missing', async () => {
    tx.blood_request_statuses.findFirst.mockResolvedValue(null);
    await expect(service.createRequest(dto(), admin)).rejects.toThrow('System error: pending status not found');
    expect(tx.blood_requests.create).not.toHaveBeenCalled();
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });

  it('UTCID07 notifyAdmins rejects after commit', async () => {
    const err = new Error('notify fail');
    notif.notifyAdmins.mockRejectedValue(err);
    await expect(service.createRequest(dto(), admin)).rejects.toBe(err);
    expect(tx.blood_requests.create).toHaveBeenCalled();
  });

  it('UTCID08 notification message uses same code as request', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    const res = await service.createRequest(dto(), admin);
    expect(tx.blood_requests.create.mock.calls[0][0].data.request_code).toBe('RQ-1000');
    expect(res).toBeDefined();
    expect(notif.notifyAdmins.mock.calls[0][1]).toContain('RQ-1000');
  });
});
