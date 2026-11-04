import { CreateBloodTypeDto, UpdateBloodTypeDto, CreateFacilityDto, UpdateFacilityDto, CreateBloodComponentDto, UpdateBloodComponentDto, CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto, CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto } from '../dto/master-data.dto';
import { MasterDataFilterDto } from '../dto/master-data-filter.dto';
import { validate, expectDtoErr } from './_helpers';
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

describe('MD-003 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vComp = { component_code: 'RBC', component_name: 'Hồng cầu lắng' };
  const vType = { blood_group: 'A', rh_factor: '+' };
  const vFac = { facility_code: 'BV-CR', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh', is_primary: false };
  const vCompat = { component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2, is_compatible: true };
  const vRule = { component_id: 1, min_interval_days: 84 };

  it('UTCID15 create: facility_code not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, facility_code: 123 }, 'body'), "facility_code must be a string");
  });
  it('UTCID16 create: empty facility_name', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, facility_name: '' }, 'body'), "facility_name should not be empty");
  });
  it('UTCID17 create: empty address', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, address: '' }, 'body'), "address should not be empty");
  });
  it('UTCID18 create: short_name not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, short_name: 123 }, 'body'), "short_name must be a string");
  });
  it('UTCID19 create: province_id not numeric', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, province_id: 'abc' }, 'body'), "province_id must be an integer number");
  });
  it('UTCID20 create: numeric string province_id transformed', async () => {
    const out: any = await validate(CreateFacilityDto, { ...vFac, province_id: '79' }, 'body');
    expect(out.province_id).toBe(79);
  });
  it('UTCID21 create: ward_id not an integer', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, ward_id: 1.5 }, 'body'), "ward_id must be an integer number");
  });
  it('UTCID22 create: phone not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, phone: 2812345678 }, 'body'), "phone must be a string");
  });
  it('UTCID23 create: email not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, email: 123 }, 'body'), "email must be a string");
  });
  it('UTCID24 create: website not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, website: 123 }, 'body'), "website must be a string");
  });
  it('UTCID25 create: latitude not a number', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, latitude: 'abc' }, 'body'), "latitude must be a number conforming to the specified constraints");
  });
  it('UTCID26 create: numeric string latitude transformed', async () => {
    const out: any = await validate(CreateFacilityDto, { ...vFac, latitude: '10.754' }, 'body');
    expect(out.latitude).toBe(10.754);
  });
  it('UTCID27 create: longitude not a number', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, longitude: 'abc' }, 'body'), "longitude must be a number conforming to the specified constraints");
  });
  it('UTCID28 create: logo_url not a string', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, logo_url: 123 }, 'body'), "logo_url must be a string");
  });
  it('UTCID29 create: is_primary not boolean', async () => {
    await expectDtoErr(validate(CreateFacilityDto, { ...vFac, is_primary: 'yes' }, 'body'), "is_primary must be a boolean value");
  });
  it('UTCID30 create: unknown property stripped (whitelist)', async () => {
    const out: any = await validate(CreateFacilityDto, { ...vFac, is_active: false, seal_url: 'x' }, 'body');
    expect(out).not.toHaveProperty('is_active'); expect(out).not.toHaveProperty('seal_url'); expect(out.facility_name).toBe(vFac.facility_name);
  });
  it('UTCID31 update: empty facility_name', async () => {
    await expectDtoErr(validate(UpdateFacilityDto, { ...vFac, facility_name: '' }, 'body'), "facility_name should not be empty");
  });
  it('UTCID32 update: is_active not boolean', async () => {
    await expectDtoErr(validate(UpdateFacilityDto, { ...vFac, is_active: 'yes' }, 'body'), "is_active must be a boolean value");
  });
  it('UTCID33 list: page 0 below @Min(1)', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { page: '0' }, 'query'), "page must not be less than 1");
  });
});
