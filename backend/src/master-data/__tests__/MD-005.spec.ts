import { CreateBloodTypeDto, UpdateBloodTypeDto, CreateFacilityDto, UpdateFacilityDto, CreateBloodComponentDto, UpdateBloodComponentDto, CreateBloodCompatibilityDto, UpdateBloodCompatibilityDto, CreateDonationIntervalRuleDto, UpdateDonationIntervalRuleDto } from '../dto/master-data.dto';
import { MasterDataFilterDto } from '../dto/master-data-filter.dto';
import { validate, expectDtoErr } from './_helpers';
import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-005 MasterDataService donation interval rules CRUD', () => {
  let prisma: any; let service: MasterDataService; let r_: any;
  beforeEach(() => {
    r_ = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ rule_id: 1 }), update: jest.fn().mockResolvedValue({ rule_id: 1 }) };
    prisma = { donation_interval_rules: r_ };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list', async () => {
    r_.findMany.mockResolvedValue([{}, {}, {}]); r_.count.mockResolvedValue(3);
    const r = await service.getDonationIntervalRules({} as any);
    expect(r.data).toHaveLength(3);
    expect(r.meta.total).toBe(3);
    expect(r_.findMany.mock.calls[0][0].include).toEqual({ component: true });
  });
  it('UTCID02 list active', async () => {
    await service.getDonationIntervalRules({ is_active: true } as any);
    expect(r_.findMany.mock.calls[0][0].where).toEqual({ is_active: true });
  });
  it('UTCID03 create', async () => {
    expect(await service.createDonationIntervalRule({ component_id: 1, min_interval_days: 84 } as any)).toEqual({ rule_id: 1 });
    expect(r_.create).toHaveBeenCalledWith({ data: expect.objectContaining({ min_interval_days: 84 }) });
  });
  it('UTCID04 create duplicate component -> BadRequest (SRS; defect: code propagates P2002)', async () => {
    r_.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    await expectErr(service.createDonationIntervalRule({ component_id: 1, min_interval_days: 84 } as any), BadRequestException);
  });
  it('UTCID05 update', async () => {
    expect(await service.updateDonationIntervalRule(1, { component_id: 1, min_interval_days: 90 } as any)).toEqual({ rule_id: 1 });
    expect(r_.update).toHaveBeenCalledWith(expect.objectContaining({ where: { rule_id: 1 } }));
  });
  it('UTCID06 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    r_.update.mockRejectedValue(err);
    expect(await errOf(service.updateDonationIntervalRule(999, { component_id: 1, min_interval_days: 90 } as any))).toBe(err);
    expect(r_.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID07 soft delete', async () => {
    r_.update.mockResolvedValue({ rule_id: 1, is_active: false });
    expect(await service.deleteDonationIntervalRule(1)).toEqual({ rule_id: 1, is_active: false });
    expect(r_.update).toHaveBeenCalledWith({ where: { rule_id: 1 }, data: { is_active: false } });
  });
});

describe('MD-005 DTO validation (ValidationPipe whitelist+transform)', () => {
  const vComp = { component_code: 'RBC', component_name: 'Hồng cầu lắng' };
  const vType = { blood_group: 'A', rh_factor: '+' };
  const vFac = { facility_code: 'BV-CR', facility_name: 'Bệnh viện Chợ Rẫy', address: '201B Nguyễn Chí Thanh', is_primary: false };
  const vCompat = { component_id: 1, donor_blood_type_id: 1, recipient_blood_type_id: 2, is_compatible: true };
  const vRule = { component_id: 1, min_interval_days: 84 };

  it('UTCID08 create: missing component_id', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, component_id: undefined }, 'body'), "component_id must be an integer number");
  });
  it('UTCID09 create: component_id not numeric', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, component_id: 'abc' }, 'body'), "component_id must be an integer number");
  });
  it('UTCID10 create: missing min_interval_days', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, min_interval_days: undefined }, 'body'), "min_interval_days must be an integer number");
  });
  it('UTCID11 create: min_interval_days not an integer', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, min_interval_days: 84.5 }, 'body'), "min_interval_days must be an integer number");
  });
  it('UTCID12 create: numeric string min_interval_days transformed', async () => {
    const out: any = await validate(CreateDonationIntervalRuleDto, { ...vRule, min_interval_days: '84' }, 'body');
    expect(out.min_interval_days).toBe(84);
  });
  it('UTCID13 create: negative min_interval_days', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, min_interval_days: -1 }, 'body'), "min_interval_days must not be less than 1");
  });
  it('UTCID14 create: max_donations_per_year not numeric', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, max_donations_per_year: 'abc' }, 'body'), "max_donations_per_year must be an integer number");
  });
  it('UTCID15 create: description not a string', async () => {
    await expectDtoErr(validate(CreateDonationIntervalRuleDto, { ...vRule, description: 123 }, 'body'), "description must be a string");
  });
  it('UTCID16 update: is_active not boolean', async () => {
    await expectDtoErr(validate(UpdateDonationIntervalRuleDto, { ...vRule, is_active: 'yes' }, 'body'), "is_active must be a boolean value");
  });
  it('UTCID17 list: page not an integer', async () => {
    await expectDtoErr(validate(MasterDataFilterDto, { page: 'abc' }, 'query'), "page must be an integer number");
  });
});
