import { CreateBloodTypeDto, UpdateBloodTypeDto, CreateFacilityDto, UpdateFacilityDto, CreateBloodComponentDto, UpdateBloodComponentDto, CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto, CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto } from '../dto/master-data.dto';
import { MasterDataFilterDto } from '../dto/master-data-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-004 MasterDataService blood compatibility CRUD', () => {
  let prisma: any; let service: MasterDataService; let bc: any;
  const DUP = 'Quy tắc tương thích này đã tồn tại trong hệ thống!';
  const dto = (o: any = {}) => ({ donor_blood_type_id: 1, recipient_blood_type_id: 2, component_id: 1, ...o });
  beforeEach(() => {
    bc = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ compatibility_id: 1 }), update: jest.fn().mockResolvedValue({ compatibility_id: 5 }),
      delete: jest.fn().mockResolvedValue({ compatibility_id: 5 }) };
    prisma = { blood_compatibility: bc };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list', async () => {
    bc.findMany.mockResolvedValue(new Array(10).fill({})); bc.count.mockResolvedValue(10);
    const r = await service.getBloodCompatibilities({} as any);
    expect(r.data).toHaveLength(10);
    expect(r.meta.total).toBe(10);
    expect(bc.findMany.mock.calls[0][0].include).toEqual({ component: true, donor_blood_type: true, recipient_blood_type: true });
  });
  it('UTCID02 list is_active=false maps to is_compatible', async () => {
    await service.getBloodCompatibilities({ is_active: false } as any);
    expect(bc.findMany.mock.calls[0][0].where).toEqual({ is_compatible: false });
  });
  it('UTCID03 create default is_compatible true', async () => {
    await service.createBloodCompatibility(dto() as any);
    expect(bc.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_compatible: true }) });
  });
  it('UTCID04 create is_compatible false', async () => {
    await service.createBloodCompatibility(dto({ is_compatible: false }) as any);
    expect(bc.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_compatible: false }) });
  });
  it('UTCID05 create duplicate', async () => {
    bc.findFirst.mockResolvedValue({ compatibility_id: 9 });
    await expectErr(service.createBloodCompatibility(dto({ is_compatible: true }) as any), BadRequestException, DUP);
    expect(bc.create).not.toHaveBeenCalled();
  });
  it('UTCID06 update ok', async () => {
    expect(await service.updateBloodCompatibility(5, dto({ is_compatible: true }) as any)).toEqual({ compatibility_id: 5 });
    expect(bc.findFirst.mock.calls[0][0].where.compatibility_id).toEqual({ not: 5 });
  });
  it('UTCID07 update duplicate triple', async () => {
    bc.findFirst.mockResolvedValue({ compatibility_id: 9 });
    await expectErr(service.updateBloodCompatibility(5, dto({ is_compatible: true }) as any), BadRequestException, DUP);
    expect(bc.update).not.toHaveBeenCalled();
  });
  it('UTCID08 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    bc.update.mockRejectedValue(err);
    expect(await errOf(service.updateBloodCompatibility(999, dto({ is_compatible: true }) as any))).toBe(err);
    expect(bc.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID09 hard delete', async () => {
    expect(await service.deleteBloodCompatibility(5)).toEqual({ compatibility_id: 5 });
    expect(bc.delete).toHaveBeenCalledWith({ where: { compatibility_id: 5 } });
  });
  it('UTCID10 delete P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    bc.delete.mockRejectedValue(err);
    expect(await errOf(service.deleteBloodCompatibility(999))).toBe(err);
  });
});

describe('MD-004 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vComp = { component_code: 'RBC', component_name: 'Hồng cầu lắng' };
  const vType = { blood_group: 'A', rh_factor: '+' };
  const vFac = { facility_code: 'BV-CR', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh', is_primary: false };
  const vCompat = { component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2, is_compatible: true };
  const vRule = { component_id: 1, min_interval_days: 84 };

  it('UTCID11 create: missing component_id', async () => {
    await expectDtoErr(validate(CreateBloodCompatibilityDto, { ...vCompat, component_id: undefined }, 'body'), "component_id must be an integer number");
  });
  it('UTCID12 create: donor_blood_type_id not numeric', async () => {
    await expectDtoErr(validate(CreateBloodCompatibilityDto, { ...vCompat, donor_blood_type_id: 'abc' }, 'body'), "donor_blood_type_id must be an integer number");
  });
  it('UTCID13 create: missing recipient_blood_type_id', async () => {
    await expectDtoErr(validate(CreateBloodCompatibilityDto, { ...vCompat, recipient_blood_type_id: undefined }, 'body'), "recipient_blood_type_id must be an integer number");
  });
  it('UTCID14 create: numeric string ids transformed', async () => {
    const out: any = await validate(CreateBloodCompatibilityDto, { ...vCompat, component_id: '1', donor_blood_type_id: '1', recipient_blood_type_id: '2' }, 'body');
    expect(out).toEqual(expect.objectContaining({ component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2 }));
  });
  it('UTCID15 create: is_compatible not boolean', async () => {
    await expectDtoErr(validate(CreateBloodCompatibilityDto, { ...vCompat, is_compatible: 'yes' }, 'body'), "is_compatible must be a boolean value");
  });
  it('UTCID16 create: notes not a string', async () => {
    await expectDtoErr(validate(CreateBloodCompatibilityDto, { ...vCompat, notes: 123 }, 'body'), "notes must be a string");
  });
  it('UTCID17 update: missing component_id', async () => {
    await expectDtoErr(validate(UpdateBloodCompatibilityDto, { ...vCompat, component_id: undefined }, 'body'), "component_id must be an integer number");
  });
  it('UTCID18 list: sortOrder not in enum', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { sortOrder: 'up' }, 'query'), "sortOrder must be one of the following values: asc, desc");
  });
});
