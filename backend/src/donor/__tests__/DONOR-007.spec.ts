import { BadRequestException } from '@nestjs/common';
import { makeDonor, D, addDays } from './helpers';

describe('DONOR-007 DonorService.recordDonation', () => {
  let s: ReturnType<typeof makeDonor>;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const base = (o: any = {}) => ({ facility_id: 1, donor_user_id: 5, blood_type_id: 1, component_id: 1, volume_ml: 350, donation_date: '2026-11-01', ...o });
  const p = () => s.prisma;
  beforeEach(() => {
    s = makeDonor();
    p().donations.create.mockImplementation(async (a: any) => ({ donation_id: 10, ...a.data }));
    p().blood_inventory.create.mockResolvedValue({ inventory_id: 20 });
    p().donation_interval_rules.findUnique.mockResolvedValue(null);
    p().donor_profiles.findUnique.mockResolvedValue({ user_id: 5, first_donation_date: null });
    s.settings.getSettingValue.mockResolvedValue('3');
  });
  afterEach(() => jest.restoreAllMocks());
  const req = (o: any = {}) => ({ request_id: 77, units_needed: 3, units_fulfilled: 1, status_id: 2, ...o });

  it('UTCID01 standard donation', async () => {
    const r = await s.service.recordDonation(admin, base() as any);
    expect(r).toMatchObject({ donation_id: 10 });
    expect(p().donations.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'COMPLETED', health_check_passed: true, request_id: null }) });
    expect(p().blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'AVAILABLE', expiry_date: addDays('2026-11-01', 35) }) });
    expect(p().inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ transaction_type: 'IN' }) });
    const next = addDays('2026-11-01', 84);
    expect(p().donor_profiles.update).toHaveBeenCalledWith({
      where: { user_id: 5 },
      data: expect.objectContaining({ next_eligible_date: next, first_donation_date: D('2026-11-01'), last_donation_date: D('2026-11-01') }),
    });
    const cm = p().donation_reminders.createMany.mock.calls[0][0].data;
    expect(cm).toHaveLength(2);
    expect(p().donation_certificates.create).toHaveBeenCalledWith({ data: { donation_id: 10, certificate_code: 'BL-2026-00010', status: 'PENDING' } });
  });

  it('UTCID02 staff facility overrides dto', async () => {
    await s.service.recordDonation({ user_id: 2, role_code: 'HOSPITAL_STAFF', facility_id: 1 }, base({ facility_id: 2 }) as any);
    expect(p().donations.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
    expect(p().blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID03 staff without facility', async () => {
    const pr = s.service.recordDonation({ user_id: 3, role_code: 'HOSPITAL_STAFF', facility_id: null }, base() as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Cơ sở y tế không hợp lệ');
    expect(p().$transaction).not.toHaveBeenCalled();
  });

  it('UTCID04 facility_id 0', async () => {
    const pr = s.service.recordDonation(admin, base({ facility_id: 0 }) as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Cơ sở y tế không hợp lệ');
    expect(p().$transaction).not.toHaveBeenCalled();
  });

  it('UTCID05 linked to request', async () => {
    p().blood_requests.findUnique.mockResolvedValue(req());
    const r = await s.service.recordDonation(admin, base({ request_code: 'REQ-001' }) as any);
    expect(r.request_id).toBe(77);
    expect(p().blood_requests.update).toHaveBeenCalledWith({ where: { request_id: 77 }, data: { units_fulfilled: 2, status_id: 2 } });
    expect(p().blood_request_status_history.create).not.toHaveBeenCalled();
    expect(p().blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'RESERVED' }) });
    expect(p().blood_request_inventory_allocations.create).toHaveBeenCalled();
    const types = p().inventory_transactions.create.mock.calls.map((c: any) => c[0].data.transaction_type);
    expect(types).toEqual(['IN', 'RESERVE']);
  });

  it('UTCID06 request becomes fulfilled', async () => {
    p().blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2 }));
    p().blood_request_statuses.findFirst.mockResolvedValue({ status_id: 5 });
    await s.service.recordDonation(admin, base({ request_code: 'REQ-001' }) as any);
    expect(p().blood_requests.update).toHaveBeenCalledWith({ where: { request_id: 77 }, data: { units_fulfilled: 2, status_id: 5 } });
    expect(p().blood_request_status_history.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ from_status_id: 2, to_status_id: 5, change_reason: 'Đã nhận đủ máu từ người hiến' }),
    });
  });

  it('UTCID07 completed status row missing', async () => {
    p().blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2 }));
    p().blood_request_statuses.findFirst.mockResolvedValue(null);
    await s.service.recordDonation(admin, base({ request_code: 'REQ-001' }) as any);
    expect(p().blood_requests.update).toHaveBeenCalledWith({ where: { request_id: 77 }, data: { units_fulfilled: 2, status_id: 2 } });
    expect(p().blood_request_status_history.create).not.toHaveBeenCalled();
  });

  it('UTCID08 unknown request code silently ignored', async () => {
    p().blood_requests.findUnique.mockResolvedValue(null);
    const r = await s.service.recordDonation(admin, base({ request_code: 'REQ-404' }) as any);
    expect(r.request_id).toBeNull();
    expect(p().blood_requests.update).not.toHaveBeenCalled();
    expect(p().blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'AVAILABLE' }) });
    expect(p().blood_request_inventory_allocations.create).not.toHaveBeenCalled();
  });

  it('UTCID09 failed screening must not be COMPLETED nor certified (defect)', async () => {
    const r = await s.service.recordDonation(admin, base({ health_check_passed: false }) as any);
    expect(r).toBeDefined();
    expect(p().blood_inventory.create).not.toHaveBeenCalled();
    expect(p().inventory_transactions.create).not.toHaveBeenCalled();
    expect(p().donor_profiles.update).not.toHaveBeenCalled();
    expect(p().donation_reminders.createMany).not.toHaveBeenCalled();
    // SRS: a failed screening is not a completed donation and gets no certificate
    expect(p().donations.create.mock.calls[0][0].data.status_code).not.toBe('COMPLETED');
    expect(p().donation_certificates.create).not.toHaveBeenCalled();
  });

  it('UTCID10 failed screening with request', async () => {
    p().blood_requests.findUnique.mockResolvedValue(req());
    const r = await s.service.recordDonation(admin, base({ health_check_passed: false, request_code: 'REQ-001' }) as any);
    expect(r.request_id).toBe(77);
    expect(p().blood_requests.update).not.toHaveBeenCalled();
    expect(p().blood_request_inventory_allocations.create).not.toHaveBeenCalled();
  });

  it('UTCID11 interval rule 14 days, setting 7', async () => {
    p().donation_interval_rules.findUnique.mockResolvedValue({ min_interval_days: 14 });
    const first = D('2025-01-01');
    p().donor_profiles.findUnique.mockResolvedValue({ user_id: 5, first_donation_date: first });
    s.settings.getSettingValue.mockResolvedValue('7');
    await s.service.recordDonation(admin, base() as any);
    const next = addDays('2026-11-01', 14);
    expect(p().donor_profiles.update).toHaveBeenCalledWith({ where: { user_id: 5 }, data: expect.objectContaining({ next_eligible_date: next, first_donation_date: first }) });
    const cm = p().donation_reminders.createMany.mock.calls[0][0].data;
    expect(cm[0]).toMatchObject({ reminder_type: 'UPCOMING_ELIGIBLE', reminder_date: addDays(next, -7) });
    expect(cm[1]).toMatchObject({ reminder_type: 'NOW_ELIGIBLE', reminder_date: next });
  });

  it('UTCID12 non-numeric setting falls back to 3', async () => {
    s.settings.getSettingValue.mockResolvedValue('abc');
    await s.service.recordDonation(admin, base() as any);
    const next = addDays('2026-11-01', 84);
    const cm = p().donation_reminders.createMany.mock.calls[0][0].data;
    expect(cm[0].reminder_date).toEqual(addDays(next, -3));
  });

  it('UTCID13 no donor profile', async () => {
    p().donor_profiles.findUnique.mockResolvedValue(null);
    const r = await s.service.recordDonation(admin, base() as any);
    expect(r).toBeDefined();
    expect(p().donor_profiles.update).not.toHaveBeenCalled();
    expect(p().donation_reminders.createMany).toHaveBeenCalled();
  });

  it('UTCID14 completed request must not be over-fulfilled (defect)', async () => {
    p().blood_requests.findUnique.mockResolvedValue(req({ units_needed: 2, units_fulfilled: 2, status_id: 5 }));
    p().blood_request_statuses.findFirst.mockResolvedValue({ status_id: 5 });
    await s.service.recordDonation(admin, base({ request_code: 'REQ-002' }) as any).catch(() => undefined);
    // SRS: closed/fulfilled requests are not updated further and no blood is reserved for them
    expect(p().blood_requests.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ units_fulfilled: 3 }) }));
    expect(p().blood_inventory.create).not.toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'RESERVED' }) });
  });
});
