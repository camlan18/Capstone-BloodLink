import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeDonor, D } from './helpers';

describe('DONOR-009 DonorService.bookDonationSlot', () => {
  let s: ReturnType<typeof makeDonor>;
  const p = () => s.prisma;
  const eligible = (next: Date | null = null) =>
    jest.spyOn(s.service, 'calculateDonorEligibility').mockResolvedValue({ nextEligibleDate: next, daysUntilNextDonation: 0, isEligible: !next } as any);
  const schedule = (o: any = {}) => ({ schedule_id: 1, date: D('2026-11-10'), status: 'OPEN', current_donors: 49, max_donors: 50, ...o });
  const reqFlow = (matches = 2) => {
    p().blood_requests.findUnique.mockResolvedValue({ request_id: 10, request_code: 'REQ-001', patient_name: 'Tran B', component_id: 1, blood_type_id: 2 });
    p().donor_profiles.findUnique.mockResolvedValue({ user_id: 5, blood_type_id: 1 });
    p().blood_compatibility.findFirst.mockResolvedValue({ is_compatible: true });
    p().blood_request_donor_matches.count.mockResolvedValue(matches);
    p().facility_donation_schedules.create.mockImplementation(async (a: any) => ({ schedule_id: 50, ...a.data }));
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule({ schedule_id: 50, current_donors: 0, max_donors: 1 }));
  };
  const reqDto = (o: any = {}) => ({ request_id: 10, facility_id: 1, specific_date: '2026-11-10', is_health_cleared: true, ...o } as any);
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    s = makeDonor();
    p().donor_availability_slots.create.mockImplementation(async (a: any) => ({ slot_id: 1, ...a.data }));
    p().users.findUnique.mockResolvedValue({ full_name: 'A' });
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('UTCID01 books schedule on eligible date', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule());
    eligible(D('2026-11-10'));
    p().donor_availability_slots.findFirst.mockResolvedValue(null);
    const r = await s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: true } as any);
    expect(r).toMatchObject({ status: 'CONFIRMED', notes: '' });
    expect(p().facility_donation_schedules.update).toHaveBeenCalledWith({ where: { schedule_id: 1 }, data: { current_donors: { increment: 1 } } });
    expect(s.notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_ids: [5] }));
    expect(s.notifications.notifyAdmins).toHaveBeenCalled();
    expect(p().blood_request_donor_matches.create).not.toHaveBeenCalled();
  });

  it('UTCID02 screening failed', async () => {
    const pr = s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: false } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Xin lỗi bạn, với dữ liệu sàng lọc hiện tại thì bạn không thể');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID03 request without specific_date', async () => {
    const pr = s.service.bookDonationSlot(5, { request_id: 10, facility_id: 1, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Vui lòng chọn lịch hiến máu hoặc cung cấp thông tin yêu cầu và ngày');
    expect(p().blood_requests.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID04 request not found', async () => {
    p().blood_requests.findUnique.mockResolvedValue(null);
    const pr = s.service.bookDonationSlot(5, reqDto({ request_id: 999 }));
    await expect(pr).rejects.toThrow(NotFoundException);
    await expect(pr).rejects.toThrow('Không tìm thấy yêu cầu máu này');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID05 no donor blood type', async () => {
    p().blood_requests.findUnique.mockResolvedValue({ request_id: 10 });
    p().donor_profiles.findUnique.mockResolvedValue(null);
    const pr = s.service.bookDonationSlot(5, reqDto());
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Vui lòng cập nhật nhóm máu trong hồ sơ trước khi hiến máu cho');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID06 incompatible blood', async () => {
    reqFlow();
    p().blood_compatibility.findFirst.mockResolvedValue({ is_compatible: false });
    const pr = s.service.bookDonationSlot(5, reqDto());
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Nhóm máu của bạn không phù hợp để hiến cho yêu cầu này.');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID07 3 accepted donors already', async () => {
    reqFlow(3);
    const pr = s.service.bookDonationSlot(5, reqDto());
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Yêu cầu này đã đủ số lượng người hiến');
    expect(p().facility_donation_schedules.create).not.toHaveBeenCalled();
  });

  it('UTCID08 request flow creates private schedule and match', async () => {
    reqFlow(2);
    eligible(null);
    p().donor_availability_slots.findFirst.mockResolvedValue(null);
    const r = await s.service.bookDonationSlot(5, reqDto({ expected_time: '08:30' }));
    expect(r.notes).toBe('Đăng ký hiến máu cho yêu cầu: Tran B (Mã: REQ-001)');
    const d = p().facility_donation_schedules.create.mock.calls[0][0].data;
    expect(d).toMatchObject({ facility_id: 1, max_donors: 1, status: 'OPEN' });
    expect([d.start_time.getHours(), d.start_time.getMinutes()]).toEqual([8, 30]);
    expect([d.end_time.getHours(), d.end_time.getMinutes()]).toEqual([9, 30]);
    expect(p().blood_request_donor_matches.create).toHaveBeenCalledWith({ data: { request_id: 10, donor_user_id: 5, match_status: 'ACCEPTED' } });
  });

  it('UTCID09 default window 07:00-17:00 and note prefix', async () => {
    reqFlow(2);
    eligible(null);
    p().donor_availability_slots.findFirst.mockResolvedValue(null);
    const r = await s.service.bookDonationSlot(5, reqDto({ notes: 'Sáng' }));
    expect(r.notes).toMatch(/^Sáng \| Đăng ký hiến máu cho yêu cầu: /);
    const d = p().facility_donation_schedules.create.mock.calls[0][0].data;
    expect(d.start_time.getHours()).toBe(7);
    expect(d.end_time.getHours()).toBe(17);
  });

  it('UTCID10 schedule not found', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(null);
    const pr = s.service.bookDonationSlot(5, { schedule_id: 999, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(NotFoundException);
    await expect(pr).rejects.toThrow('Lịch hiến máu không tồn tại');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID11 one day before eligible date', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule());
    eligible(D('2026-11-11'));
    const pr = s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Bạn chưa đủ điều kiện thời gian để hiến máu tiếp. Ngày có thể');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID12 schedule full', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule({ current_donors: 50 }));
    eligible(null);
    const pr = s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Lịch này đã đủ số lượng đăng ký');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID13 schedule closed', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule({ current_donors: 10, status: 'CLOSED' }));
    eligible(null);
    const pr = s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Lịch này không còn nhận đăng ký');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID14 duplicate booking', async () => {
    p().facility_donation_schedules.findUnique.mockResolvedValue(schedule());
    eligible(null);
    p().donor_availability_slots.findFirst.mockResolvedValue({ slot_id: 3 });
    const pr = s.service.bookDonationSlot(5, { schedule_id: 1, is_health_cleared: true } as any);
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Bạn đã đăng ký lịch này rồi');
    expect(p().donor_availability_slots.create).not.toHaveBeenCalled();
  });

  it('UTCID15 no orphan schedule when eligibility fails (defect)', async () => {
    reqFlow(2);
    eligible(D('2026-12-01'));
    const pr = s.service.bookDonationSlot(5, reqDto());
    await expect(pr).rejects.toThrow(BadRequestException);
    await expect(pr).rejects.toThrow('Bạn chưa đủ điều kiện thời gian để hiến máu tiếp');
    // SRS: eligibility is checked before any write / the whole flow is transactional
    expect(p().facility_donation_schedules.create).not.toHaveBeenCalled();
  });
});
