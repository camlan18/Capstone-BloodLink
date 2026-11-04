import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RequestService } from '../request.service';
import { CreateRequestDto } from '../dto/create-request.dto';

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

  // ---- DTO validation: ValidationPipe({ whitelist: true, transform: true }) as in src/main.ts ----
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) => pipe.transform(body, { type: 'body', metatype: CreateRequestDto, data: '' });
  const valid = (): any => ({ facility_id: 1, patient_name: 'Nguyen Van A', blood_type_id: 1, component_id: 1, units_needed: 2, urgency_id: 1, is_emergency: true });
  const omit = (k: string) => { const b = valid(); delete b[k]; return b; };

  it('UTCID09 DTO facility_id missing', async () => {
    const body: any = omit('facility_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be an integer number");
  });

  it('UTCID10 DTO facility_id not integer (1.5)', async () => {
    const body: any = { ...valid(), facility_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be an integer number");
  });

  it('UTCID11 DTO facility_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), facility_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be a positive number");
  });

  it('UTCID12 DTO facility_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), facility_id: 1 })).resolves.toEqual(expect.objectContaining({ facility_id: 1 }));
  });

  it('UTCID13 DTO patient_name empty', async () => {
    const body: any = { ...valid(), patient_name: '' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("patient_name should not be empty");
  });

  it('UTCID14 DTO patient_name not a string', async () => {
    const body: any = { ...valid(), patient_name: 123 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("patient_name must be a string");
  });

  it('UTCID15 DTO patient_name length 150 (max)', async () => {
    await expect(run({ ...valid(), patient_name: 'a'.repeat(150) })).resolves.toEqual(expect.objectContaining({ patient_name: 'a'.repeat(150) }));
  });

  it('UTCID16 DTO patient_name length 151', async () => {
    const body: any = { ...valid(), patient_name: 'a'.repeat(151) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("patient_name must be shorter than or equal to 150 characters");
  });

  it('UTCID17 DTO blood_type_id missing', async () => {
    const body: any = omit('blood_type_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be an integer number");
  });

  it('UTCID18 DTO blood_type_id not integer (1.5)', async () => {
    const body: any = { ...valid(), blood_type_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be an integer number");
  });

  it('UTCID19 DTO blood_type_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), blood_type_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be a positive number");
  });

  it('UTCID20 DTO blood_type_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), blood_type_id: 1 })).resolves.toEqual(expect.objectContaining({ blood_type_id: 1 }));
  });

  it('UTCID21 DTO component_id missing', async () => {
    const body: any = omit('component_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be an integer number");
  });

  it('UTCID22 DTO component_id not integer (1.5)', async () => {
    const body: any = { ...valid(), component_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be an integer number");
  });

  it('UTCID23 DTO component_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), component_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be a positive number");
  });

  it('UTCID24 DTO component_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), component_id: 1 })).resolves.toEqual(expect.objectContaining({ component_id: 1 }));
  });

  it('UTCID25 DTO units_needed missing', async () => {
    const body: any = omit('units_needed');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("units_needed must be an integer number");
  });

  it('UTCID26 DTO units_needed not integer (1.5)', async () => {
    const body: any = { ...valid(), units_needed: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("units_needed must be an integer number");
  });

  it('UTCID27 DTO units_needed = 0 (below min)', async () => {
    const body: any = { ...valid(), units_needed: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("units_needed must not be less than 1");
  });

  it('UTCID28 DTO units_needed = 1 (min boundary)', async () => {
    await expect(run({ ...valid(), units_needed: 1 })).resolves.toEqual(expect.objectContaining({ units_needed: 1 }));
  });

  it('UTCID29 DTO units_needed = 20 (max boundary)', async () => {
    await expect(run({ ...valid(), units_needed: 20 })).resolves.toEqual(expect.objectContaining({ units_needed: 20 }));
  });

  it('UTCID30 DTO units_needed = 21 (above max)', async () => {
    const body: any = { ...valid(), units_needed: 21 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("units_needed must not be greater than 20");
  });

  it('UTCID31 DTO urgency_id missing', async () => {
    const body: any = omit('urgency_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("urgency_id must be an integer number");
  });

  it('UTCID32 DTO urgency_id not integer (1.5)', async () => {
    const body: any = { ...valid(), urgency_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("urgency_id must be an integer number");
  });

  it('UTCID33 DTO urgency_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), urgency_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("urgency_id must be a positive number");
  });

  it('UTCID34 DTO urgency_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), urgency_id: 1 })).resolves.toEqual(expect.objectContaining({ urgency_id: 1 }));
  });

  it('UTCID35 DTO is_emergency missing', async () => {
    const body: any = omit('is_emergency');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("is_emergency must be a boolean value");
  });

  it('UTCID36 DTO is_emergency "yes"', async () => {
    const body: any = { ...valid(), is_emergency: 'yes' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("is_emergency must be a boolean value");
  });

  it('UTCID37 DTO clinical_notes length 1000 (max)', async () => {
    await expect(run({ ...valid(), clinical_notes: 'a'.repeat(1000) })).resolves.toEqual(expect.objectContaining({ clinical_notes: 'a'.repeat(1000) }));
  });

  it('UTCID38 DTO clinical_notes length 1001', async () => {
    const body: any = { ...valid(), clinical_notes: 'a'.repeat(1001) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("clinical_notes must be shorter than or equal to 1000 characters");
  });

  it('UTCID39 DTO patient_phone length 20 (max)', async () => {
    await expect(run({ ...valid(), patient_phone: 'a'.repeat(20) })).resolves.toEqual(expect.objectContaining({ patient_phone: 'a'.repeat(20) }));
  });

  it('UTCID40 DTO patient_phone length 21', async () => {
    const body: any = { ...valid(), patient_phone: 'a'.repeat(21) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("patient_phone must be shorter than or equal to 20 characters");
  });

  it('UTCID41 DTO hospital_name length 200 (max)', async () => {
    await expect(run({ ...valid(), hospital_name: 'a'.repeat(200) })).resolves.toEqual(expect.objectContaining({ hospital_name: 'a'.repeat(200) }));
  });

  it('UTCID42 DTO hospital_name length 201', async () => {
    const body: any = { ...valid(), hospital_name: 'a'.repeat(201) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("hospital_name must be shorter than or equal to 200 characters");
  });

  it('UTCID43 DTO ward_room length 100 (max)', async () => {
    await expect(run({ ...valid(), ward_room: 'a'.repeat(100) })).resolves.toEqual(expect.objectContaining({ ward_room: 'a'.repeat(100) }));
  });

  it('UTCID44 DTO ward_room length 101', async () => {
    const body: any = { ...valid(), ward_room: 'a'.repeat(101) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("ward_room must be shorter than or equal to 100 characters");
  });

  it('UTCID45 DTO province_id not integer', async () => {
    const body: any = { ...valid(), province_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("province_id must be an integer number");
  });

  it('UTCID46 DTO ward_id not integer', async () => {
    const body: any = { ...valid(), ward_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("ward_id must be an integer number");
  });

  it('UTCID47 DTO address length 500 (max)', async () => {
    await expect(run({ ...valid(), address: 'a'.repeat(500) })).resolves.toEqual(expect.objectContaining({ address: 'a'.repeat(500) }));
  });

  it('UTCID48 DTO address length 501', async () => {
    const body: any = { ...valid(), address: 'a'.repeat(501) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("address must be shorter than or equal to 500 characters");
  });

  it('UTCID49 DTO latitude "abc"', async () => {
    const body: any = { ...valid(), latitude: 'abc' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("latitude must be a number conforming to the specified constraints");
  });

  it('UTCID50 DTO longitude "abc"', async () => {
    const body: any = { ...valid(), longitude: 'abc' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("longitude must be a number conforming to the specified constraints");
  });

  it('UTCID51 DTO required_before not ISO date', async () => {
    const body: any = { ...valid(), required_before: 'tomorrow' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("required_before must be a valid ISO 8601 date string");
  });

  it('UTCID52 DTO unknown property status_id stripped', async () => {
    const out: any = await run({ ...valid(), status_id: 5 });
    expect(out).not.toHaveProperty('status_id');
    expect(out).toEqual(expect.objectContaining(valid()));
  });
});
