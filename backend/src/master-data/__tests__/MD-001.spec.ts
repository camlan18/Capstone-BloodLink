import { CreateBloodTypeDto, UpdateBloodTypeDto, CreateFacilityDto, UpdateFacilityDto, CreateBloodComponentDto, UpdateBloodComponentDto, CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto, CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto } from '../dto/master-data.dto';
import { MasterDataFilterDto } from '../dto/master-data-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-001 MasterDataService blood components CRUD', () => {
  let prisma: any; let service: MasterDataService;
  beforeEach(() => {
    prisma = { blood_components: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ component_id: 1 }), update: jest.fn().mockResolvedValue({ component_id: 1 }) } };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list dropdown (no query)', async () => {
    prisma.blood_components.findMany.mockResolvedValue([{}, {}, {}]);
    const r = await service.getBloodComponents(undefined);
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(3);
    expect(prisma.blood_components.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { is_active: true }, include: { interval_rules: true } }));
    expect(prisma.blood_components.count).not.toHaveBeenCalled();
  });
  it('UTCID02 list dropdown (empty query)', async () => {
    prisma.blood_components.findMany.mockResolvedValue([{}, {}, {}]);
    const r = await service.getBloodComponents({} as any);
    expect(r).toHaveLength(3);
    expect(prisma.blood_components.count).not.toHaveBeenCalled();
  });
  it('UTCID03 paginated with search', async () => {
    prisma.blood_components.count.mockResolvedValue(3);
    const r: any = await service.getBloodComponents({ page: 1, search: 'Hồng' } as any);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blood_components.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { component_name: { contains: 'Hồng' } }, orderBy: { component_id: 'asc' } }));
  });
  it('UTCID04 create ok', async () => {
    prisma.blood_components.findFirst.mockResolvedValue(null);
    expect(await service.createBloodComponent({ component_code: 'RBC', component_name: 'x' } as any)).toEqual({ component_id: 1 });
    expect(prisma.blood_components.create).toHaveBeenCalled();
  });
  it('UTCID05 create duplicate code', async () => {
    prisma.blood_components.findFirst.mockResolvedValue({ component_id: 2 });
    await expectErr(service.createBloodComponent({ component_code: 'RBC' } as any), BadRequestException, 'Mã thành phần máu này đã tồn tại');
    expect(prisma.blood_components.create).not.toHaveBeenCalled();
  });
  it('UTCID06 update ok', async () => {
    expect(await service.updateBloodComponent(1, { component_code: 'RBC' } as any)).toEqual({ component_id: 1 });
    expect(prisma.blood_components.update).toHaveBeenCalledWith(expect.objectContaining({ where: { component_id: 1 } }));
  });
  it('UTCID07 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_components.update.mockRejectedValue(err);
    expect(await errOf(service.updateBloodComponent(999, { component_code: 'RBC' } as any))).toBe(err);
    expect(prisma.blood_components.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID08 soft delete', async () => {
    prisma.blood_components.update.mockResolvedValue({ component_id: 1, is_active: false });
    expect(await service.deleteBloodComponent(1)).toEqual({ component_id: 1, is_active: false });
    expect(prisma.blood_components.update).toHaveBeenCalledWith({ where: { component_id: 1 }, data: { is_active: false } });
  });
  it('UTCID09 delete P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_components.update.mockRejectedValue(err);
    expect(await errOf(service.deleteBloodComponent(999))).toBe(err);
    expect(prisma.blood_components.update).toHaveBeenCalledTimes(1);
  });
});

describe('MD-001 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vComp = { component_code: 'RBC', component_name: 'Hồng cầu lắng' };
  const vType = { blood_group: 'A', rh_factor: '+' };
  const vFac = { facility_code: 'BV-CR', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh', is_primary: false };
  const vCompat = { component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2, is_compatible: true };
  const vRule = { component_id: 1, min_interval_days: 84 };

  it('UTCID10 list: page 0 below @Min(1)', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { page: '0' }, 'query'), "page must not be less than 1");
  });
  it('UTCID11 list: page 1 accepted', async () => {
    const out: any = await validate(MasterDataFilterDto, { page: '1' }, 'query');
    expect(out.page).toBe(1); expect(out.limit).toBe(20);
  });
  it('UTCID12 list: limit 0 below @Min(1)', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { limit: '0' }, 'query'), "limit must not be less than 1");
  });
  it('UTCID13 list: limit 1 accepted', async () => {
    const out: any = await validate(MasterDataFilterDto, { limit: '1' }, 'query');
    expect(out.limit).toBe(1);
  });
  it('UTCID14 list: page not an integer', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { page: 'abc' }, 'query'), "page must be an integer number");
  });
  it('UTCID15 list: sortOrder not in enum', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { sortOrder: 'up' }, 'query'), "sortOrder must be one of the following values: asc, desc");
  });
  it('UTCID16 list: is_active=false string', async () => {
    const out: any = await validate(MasterDataFilterDto, { is_active: 'false' }, 'query');
    expect(out.is_active).toBe(false);
  });
  it('UTCID17 create: empty component_code', async () => {
    await expectDtoErr(validate(CreateBloodComponentDto, { ...vComp, component_code: '' }, 'body'), "component_code should not be empty");
  });
  it('UTCID18 create: empty component_name', async () => {
    await expectDtoErr(validate(CreateBloodComponentDto, { ...vComp, component_name: '' }, 'body'), "component_name should not be empty");
  });
  it('UTCID19 create: description not a string', async () => {
    await expectDtoErr(validate(CreateBloodComponentDto, { ...vComp, description: 123 }, 'body'), "description must be a string");
  });
  it('UTCID20 update: empty component_name', async () => {
    await expectDtoErr(validate(UpdateBloodComponentDto, { ...vComp, component_name: '' }, 'body'), "component_name should not be empty");
  });
  it('UTCID21 update: is_active not boolean', async () => {
    await expectDtoErr(validate(UpdateBloodComponentDto, { ...vComp, is_active: 'yes' }, 'body'), "is_active must be a boolean value");
  });
});
