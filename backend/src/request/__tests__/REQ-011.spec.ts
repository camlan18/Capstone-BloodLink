import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RequestService } from '../request.service';
import { CreateRequestDto } from '../dto/create-request.dto';

describe('REQ-011 RequestService.createPublicRequest', () => {
  let prisma: any, tx: any, notif: any, service: RequestService;
  const dto = (o: any = {}): any => ({
    patient_name: 'Nguyen Van A', blood_type_id: 1, component_id: 1, units_needed: 2, urgency_id: 1, facility_id: 1, ...o,
  });

  beforeEach(() => {
    tx = {
      blood_request_statuses: { findFirst: jest.fn().mockResolvedValue({ status_id: 1 }) },
      blood_requests: { create: jest.fn().mockResolvedValue({ request_id: 100 }) },
      blood_request_status_history: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    notif = { notifyAdmins: jest.fn().mockResolvedValue(undefined) };
    service = new RequestService(prisma as any, {} as any, notif as any, {} as any);
  });

  it('UTCID01 guest request', async () => {
    const res = await service.createPublicRequest(dto(), null);
    expect(res).toEqual({ request_id: 100 });
    expect(tx.blood_requests.create).toHaveBeenCalledWith({ data: expect.objectContaining({ requester_user_id: null, facility_id: 1 }) });
    expect(tx.blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ changed_by: null, change_reason: 'Người nhà bệnh nhân tạo yêu cầu khẩn cấp' }),
    });
    expect(notif.notifyAdmins).toHaveBeenCalledWith('Yêu cầu máu khẩn cấp', expect.any(String), 'WARNING', 'REQUEST', 100);
  });

  it('UTCID02 member request', async () => {
    await service.createPublicRequest(dto(), 9);
    expect(tx.blood_requests.create).toHaveBeenCalledWith({ data: expect.objectContaining({ requester_user_id: 9 }) });
  });

  it('UTCID03 no required_before', async () => {
    const res = await service.createPublicRequest(dto({ required_before: undefined }), null);
    expect(res).toBeDefined();
    expect(tx.blood_requests.create.mock.calls[0][0].data.required_before).toBeNull();
  });

  it('UTCID04 pending status missing', async () => {
    tx.blood_request_statuses.findFirst.mockResolvedValue(null);
    await expect(service.createPublicRequest(dto(), null)).rejects.toThrow('System error: pending status not found');
    expect(tx.blood_requests.create).not.toHaveBeenCalled();
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });

  it('UTCID05 no facility_id, create rejects', async () => {
    const err = new Error('Prisma validation');
    tx.blood_requests.create.mockRejectedValue(err);
    await expect(service.createPublicRequest(dto({ facility_id: undefined }), null)).rejects.toBe(err);
    expect(notif.notifyAdmins).not.toHaveBeenCalled();
  });

  it('UTCID06 notifyAdmins rejects', async () => {
    const err = new Error('notify fail');
    notif.notifyAdmins.mockRejectedValue(err);
    await expect(service.createPublicRequest(dto(), null)).rejects.toBe(err);
    expect(tx.blood_requests.create).toHaveBeenCalled();
  });

  // ---- DTO validation: ValidationPipe({ whitelist: true, transform: true }) as in src/main.ts ----
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) => pipe.transform(body, { type: 'body', metatype: CreateRequestDto, data: '' });
  const valid = (): any => ({ facility_id: 1, patient_name: 'Nguyen Van A', blood_type_id: 1, component_id: 1, units_needed: 2, urgency_id: 1, is_emergency: true });
  const omit = (k: string) => { const b = valid(); delete b[k]; return b; };

  it('UTCID07 DTO patient_name empty', async () => {
    const body: any = { ...valid(), patient_name: '' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("patient_name should not be empty");
  });

  it('UTCID08 DTO units_needed = 21 (above max)', async () => {
    const body: any = { ...valid(), units_needed: 21 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("units_needed must not be greater than 20");
  });

  it('UTCID09 DTO is_emergency missing', async () => {
    const body: any = omit('is_emergency');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("is_emergency must be a boolean value");
  });
});
