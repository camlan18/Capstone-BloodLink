import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-003 MasterDataService facilities CRUD', () => {
  let prisma: any; let service: MasterDataService; let mf: any;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    mf = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({ facility_id: 1 }),
      update: jest.fn().mockResolvedValue({ facility_id: 1 }) };
    prisma = { medical_facilities: mf };
    service = new MasterDataService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 list', async () => {
    mf.findMany.mockResolvedValue([{}, {}]); mf.count.mockResolvedValue(2);
    const r = await service.getFacilities({} as any);
    expect(r.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
    expect(mf.findMany.mock.calls[0][0].orderBy).toEqual({ is_primary: 'desc' });
  });
  it('UTCID02 getById ok', async () => {
    const f = { facility_id: 1, province: {}, ward: {} };
    mf.findUnique.mockResolvedValue(f);
    expect(await service.getFacilityById(1)).toBe(f);
  });
  it('UTCID03 getById not found', async () => {
    mf.findUnique.mockResolvedValue(null);
    await expectErr(service.getFacilityById(999), NotFoundException, 'Cơ sở y tế không tồn tại');
  });
  it('UTCID04 create non-primary', async () => {
    mf.findUnique.mockResolvedValue(null);
    expect(await service.createFacility({ facility_code: 'BV-CR', is_primary: false } as any)).toEqual({ facility_id: 1 });
    expect(mf.updateMany).not.toHaveBeenCalled();
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_code: 'BV-CR' }) });
  });
  it('UTCID05 create with generated code', async () => {
    mf.findUnique.mockResolvedValue(null);
    await service.createFacility({ is_primary: false } as any);
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      facility_code: `FAC-${new Date('2026-11-03T08:00:00Z').getTime()}` }) });
  });
  it('UTCID06 create primary clears others', async () => {
    mf.findUnique.mockResolvedValue(null);
    await service.createFacility({ facility_code: 'BV-CR', is_primary: true } as any);
    expect(mf.updateMany).toHaveBeenCalledWith({ where: { is_primary: true }, data: { is_primary: false } });
    expect(mf.create).toHaveBeenCalled();
  });
  it('UTCID07 create duplicate code', async () => {
    mf.findUnique.mockResolvedValue({ facility_id: 5 });
    await expectErr(service.createFacility({ facility_code: 'BV-CR', is_primary: false } as any), BadRequestException, 'Mã cơ sở y tế đã tồn tại');
    expect(mf.create).not.toHaveBeenCalled();
    expect(mf.updateMany).not.toHaveBeenCalled();
  });
  it('UTCID08 update primary', async () => {
    expect(await service.updateFacility(1, { is_primary: true } as any)).toEqual({ facility_id: 1 });
    expect(mf.updateMany).toHaveBeenCalledWith({ where: { is_primary: true, facility_id: { not: 1 } }, data: { is_primary: false } });
  });
  it('UTCID09 update non-primary', async () => {
    expect(await service.updateFacility(1, { is_primary: false } as any)).toEqual({ facility_id: 1 });
    expect(mf.updateMany).not.toHaveBeenCalled();
  });
  it('UTCID10 update P2025 after primary flags cleared', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    mf.update.mockRejectedValue(err);
    expect(await errOf(service.updateFacility(999, { is_primary: true } as any))).toBe(err);
    expect(mf.updateMany).toHaveBeenCalled();
  });
  it('UTCID11 soft delete', async () => {
    mf.update.mockResolvedValue({ facility_id: 1, is_active: false });
    expect(await service.deleteFacility(1)).toEqual({ facility_id: 1, is_active: false });
    expect(mf.update).toHaveBeenCalledWith({ where: { facility_id: 1 }, data: { is_active: false } });
  });
  it('UTCID12 seal forbidden for other facility staff', async () => {
    await expectErr(service.updateFacilitySealSignature(1, {}, { role_code: 'HOSPITAL_STAFF', facility_id: 2 }), ForbiddenException,
      'Bạn chỉ có quyền cập nhật con dấu và chữ ký của cơ sở y tế mình trực thuộc');
    expect(mf.findUnique).not.toHaveBeenCalled();
  });
  it('UTCID13 seal update keeps old values', async () => {
    mf.findUnique.mockResolvedValue({ facility_id: 1, seal_image_url: 'old-seal', signature_image_url: 'old-sig', director_name: 'D', director_title: 'T' });
    mf.update.mockResolvedValue({ facility_id: 1, seal_image_url: 'new-seal' });
    const r = await service.updateFacilitySealSignature(1, { seal_image_url: 'new-seal' }, { role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(r.seal_image_url).toBe('new-seal');
    expect(mf.update).toHaveBeenCalledWith({ where: { facility_id: 1 }, data: {
      seal_image_url: 'new-seal', signature_image_url: 'old-sig', director_name: 'D', director_title: 'T' } });
  });
  it('UTCID14 seal facility not found', async () => {
    mf.findUnique.mockResolvedValue(null);
    await expectErr(service.updateFacilitySealSignature(999, {}, { role_code: 'ADMIN', facility_id: null }), NotFoundException, 'Không tìm thấy cơ sở y tế');
    expect(mf.update).not.toHaveBeenCalled();
  });
});
