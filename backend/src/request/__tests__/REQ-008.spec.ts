import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-008 RequestService.findDonorMatches', () => {
  let prisma: any, mail: any, service: RequestService, haversine: jest.SpyInstance;
  const NOW = new Date('2026-11-03T08:00:00Z');
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000);
  const donor = (o: any = {}) => ({
    user_id: 20, blood_type_id: 1, is_available_for_donation: true, email: 'd@x.com', full_name: 'D',
    latitude: null, longitude: null, donations_donor: [], ...o,
  });
  const matches = () => prisma.blood_request_donor_matches.createMany.mock.calls[0][0].data;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = {
      blood_requests: {
        findUnique: jest.fn().mockResolvedValue({
          request_id: 1, facility_id: 1, blood_type_id: 1, component_id: 1, patient_name: 'P',
          latitude: 10, longitude: 106,
          facility: { facility_name: 'F', address: 'Addr' }, blood_type: { blood_type_code: 'O+' },
        }),
      },
      blood_compatibility: { findMany: jest.fn().mockResolvedValue([{ donor_blood_type_id: 1 }, { donor_blood_type_id: 2 }]) },
      users: { findMany: jest.fn().mockResolvedValue([donor()]) },
      donation_interval_rules: { findFirst: jest.fn().mockResolvedValue({ min_interval_days: 56 }) },
      system_settings: { findFirst: jest.fn().mockResolvedValue({ setting_value: '50' }) },
      blood_request_donor_matches: { createMany: jest.fn().mockResolvedValue({}) },
    };
    mail = { sendDonorMatchEmail: jest.fn().mockResolvedValue(undefined) };
    service = new RequestService(prisma as any, {} as any, {} as any, mail as any);
    haversine = jest.spyOn(service as any, 'calculateHaversineDistance').mockReturnValue(3);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 same-type donor 3km', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ latitude: 10.03, longitude: 106 })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res).toEqual({ message: 'Đã tìm thấy và tạo 1 ghép nối tiềm năng', count: 1 });
    expect(matches()).toEqual([expect.objectContaining({ match_score: 100, match_status: 'PENDING', distance_km: 3 })]);
    expect(mail.sendDonorMatchEmail).toHaveBeenCalledTimes(1);
  });

  it('UTCID02 cross type, unavailable', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ blood_type_id: 2, is_available_for_donation: false })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res.count).toBe(1);
    expect(matches()[0]).toEqual(expect.objectContaining({ match_score: 60, distance_km: null }));
  });

  it('UTCID03 no compatibility rows, no donors', async () => {
    prisma.blood_compatibility.findMany.mockResolvedValue([]);
    prisma.users.findMany.mockResolvedValue([]);
    const res = await service.findDonorMatches(1, admin);
    expect(res).toEqual({ message: 'Không tìm thấy người hiến máu phù hợp lúc này', count: 0 });
    expect(prisma.users.findMany.mock.calls[0][0].where.blood_type_id).toEqual({ in: [1] });
    expect(prisma.blood_request_donor_matches.createMany).not.toHaveBeenCalled();
  });

  it('UTCID04 donated 55 days ago skipped', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ donations_donor: [{ donation_date: daysAgo(55) }] })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res).toEqual({ message: 'Không tìm thấy người hiến máu đủ điều kiện lúc này', count: 0 });
    expect(prisma.blood_request_donor_matches.createMany).not.toHaveBeenCalled();
  });

  it('UTCID05 donated exactly 56 days ago', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ donations_donor: [{ donation_date: daysAgo(56) }] })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res.count).toBe(1);
    expect(matches()[0].match_score).toBe(90);
  });

  it('UTCID06 donated 84 days ago', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ donations_donor: [{ donation_date: daysAgo(84) }] })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res.count).toBe(1);
    expect(matches()[0].match_score).toBe(100);
  });

  it('UTCID07 defaults when rule/setting absent', async () => {
    prisma.donation_interval_rules.findFirst.mockResolvedValue(null);
    prisma.system_settings.findFirst.mockResolvedValue(null);
    prisma.users.findMany.mockResolvedValue([donor({ donations_donor: [{ donation_date: daysAgo(55) }] }), donor({ user_id: 21 })]);
    const res = await service.findDonorMatches(1, admin);
    expect(prisma.donation_interval_rules.findFirst).toHaveBeenCalled();
    expect(prisma.system_settings.findFirst).toHaveBeenCalled();
    expect(res.count).toBe(1);
  });

  it('UTCID08 10km bonus', async () => {
    haversine.mockReturnValue(10);
    prisma.users.findMany.mockResolvedValue([donor({ latitude: 10.1, longitude: 106 })]);
    await service.findDonorMatches(1, admin);
    expect(matches()[0]).toEqual(expect.objectContaining({ match_score: 100, distance_km: 10 }));
  });

  it('UTCID09 15km penalty', async () => {
    haversine.mockReturnValue(15);
    prisma.users.findMany.mockResolvedValue([donor({ latitude: 10.1, longitude: 106 })]);
    await service.findDonorMatches(1, admin);
    expect(matches()[0].match_score).toBe(95);
  });

  it('UTCID10 30km penalty', async () => {
    haversine.mockReturnValue(30);
    prisma.users.findMany.mockResolvedValue([donor({ latitude: 10.1, longitude: 106 })]);
    await service.findDonorMatches(1, admin);
    expect(matches()[0].match_score).toBe(85);
  });

  it('UTCID11 out of radius', async () => {
    haversine.mockReturnValue(60);
    prisma.users.findMany.mockResolvedValue([donor({ latitude: 10.5, longitude: 106 })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res).toEqual({ message: 'Không tìm thấy người hiến máu đủ điều kiện lúc này', count: 0 });
    expect(prisma.blood_request_donor_matches.createMany).not.toHaveBeenCalled();
    expect(mail.sendDonorMatchEmail).not.toHaveBeenCalled();
  });

  it('UTCID12 donor without email', async () => {
    prisma.users.findMany.mockResolvedValue([donor({ email: null })]);
    const res = await service.findDonorMatches(1, admin);
    expect(res.count).toBe(1);
    expect(prisma.blood_request_donor_matches.createMany).toHaveBeenCalled();
    expect(mail.sendDonorMatchEmail).not.toHaveBeenCalled();
  });

  it('UTCID13 request not found', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.findDonorMatches(999, admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Yêu cầu không tồn tại');
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it('UTCID14 other facility staff', async () => {
    const p = service.findDonorMatches(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền thao tác trên yêu cầu này');
    expect(prisma.blood_request_donor_matches.createMany).not.toHaveBeenCalled();
  });

  it('UTCID15 email rejects', async () => {
    const err = new Error('mail fail');
    mail.sendDonorMatchEmail.mockRejectedValue(err);
    await expect(service.findDonorMatches(1, admin)).rejects.toBe(err);
    expect(prisma.blood_request_donor_matches.createMany).toHaveBeenCalled();
  });
});
