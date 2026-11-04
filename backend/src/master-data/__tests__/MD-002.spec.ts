import { CreateBloodTypeDto, UpdateBloodTypeDto, CreateFacilityDto, UpdateFacilityDto, CreateBloodComponentDto, UpdateBloodComponentDto, CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto, CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto } from '../dto/master-data.dto';
import { MasterDataFilterDto } from '../dto/master-data-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-002 MasterDataService blood types CRUD', () => {
  let prisma: any; let service: MasterDataService;
  beforeEach(() => {
    prisma = { blood_types: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ blood_type_id: 1 }),
      update: jest.fn().mockResolvedValue({ blood_type_id: 1 }) } };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list default', async () => {
    prisma.blood_types.findMany.mockResolvedValue(new Array(8).fill({}));
    prisma.blood_types.count.mockResolvedValue(8);
    const r = await service.getBloodTypes({} as any);
    expect(r.data).toHaveLength(8);
    expect(r.meta).toEqual({ total: 8, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blood_types.findMany.mock.calls[0][0].orderBy).toEqual({ display_order: 'asc' });
  });
  it('UTCID02 list filtered', async () => {
    prisma.blood_types.findMany.mockResolvedValue([{}]);
    await service.getBloodTypes({ search: 'A', is_active: true } as any);
    expect(prisma.blood_types.findMany.mock.calls[0][0].where).toEqual({ is_active: true, abo: { contains: 'A' } });
  });
  it('UTCID03 create A+', async () => {
    expect(await service.createBloodType({ blood_group: 'A', rh_factor: '+' } as any)).toEqual({ blood_type_id: 1 });
    expect(prisma.blood_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ blood_type_code: 'APOS', display_order: 0 }) });
  });
  it('UTCID04 create O-', async () => {
    await service.createBloodType({ blood_group: 'O', rh_factor: '-' } as any);
    expect(prisma.blood_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ blood_type_code: 'ONEG' }) });
  });
  it('UTCID05 create duplicate', async () => {
    prisma.blood_types.findFirst.mockResolvedValue({ blood_type_id: 3 });
    await expectErr(service.createBloodType({ blood_group: 'A', rh_factor: '+' } as any), BadRequestException, 'Nhóm máu này đã tồn tại');
    expect(prisma.blood_types.create).not.toHaveBeenCalled();
  });
  it('UTCID06 update rh only has no abo key', async () => {
    expect(await service.updateBloodType(1, { rh_factor: '-' } as any)).toEqual({ blood_type_id: 1 });
    expect(prisma.blood_types.update.mock.calls[0][0].data).not.toHaveProperty('abo');
  });
  it('UTCID07 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_types.update.mockRejectedValue(err);
    expect(await errOf(service.updateBloodType(999, { blood_group: 'A', rh_factor: '+' } as any))).toBe(err);
    expect(prisma.blood_types.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID08 soft delete', async () => {
    prisma.blood_types.update.mockResolvedValue({ blood_type_id: 1, is_active: false });
    expect(await service.deleteBloodType(1)).toEqual({ blood_type_id: 1, is_active: false });
    expect(prisma.blood_types.update).toHaveBeenCalledWith({ where: { blood_type_id: 1 }, data: { is_active: false } });
  });
});

describe('MD-002 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vComp = { component_code: 'RBC', component_name: 'Hồng cầu lắng' };
  const vType = { blood_group: 'A', rh_factor: '+' };
  const vFac = { facility_code: 'BV-CR', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh', is_primary: false };
  const vCompat = { component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2, is_compatible: true };
  const vRule = { component_id: 1, min_interval_days: 84 };

  it('UTCID09 create: empty blood_group', async () => {
    await expectDtoErr(validate(CreateBloodTypeDto, { ...vType, blood_group: '' }, 'body'), "blood_group should not be empty");
  });
  it('UTCID10 create: empty rh_factor', async () => {
    await expectDtoErr(validate(CreateBloodTypeDto, { ...vType, rh_factor: '' }, 'body'), "rh_factor should not be empty");
  });
  it('UTCID11 create: display_order not numeric', async () => {
    await expectDtoErr(validate(CreateBloodTypeDto, { ...vType, display_order: 'abc' }, 'body'), "display_order must be an integer number");
  });
  it('UTCID12 create: numeric string display_order transformed', async () => {
    const out: any = await validate(CreateBloodTypeDto, { ...vType, display_order: '2' }, 'body');
    expect(out.display_order).toBe(2);
  });
  it('UTCID13 update: missing blood_group (PUT needs full body)', async () => {
    await expectDtoErr(validate(UpdateBloodTypeDto, { rh_factor: '-' }, 'body'), "blood_group should not be empty");
  });
  it('UTCID14 update: is_active not boolean', async () => {
    await expectDtoErr(validate(UpdateBloodTypeDto, { ...vType, is_active: 'yes' }, 'body'), "is_active must be a boolean value");
  });
  it('UTCID15 list: limit 0 below @Min(1)', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { limit: '0' }, 'query'), "limit must not be less than 1");
  });
});
