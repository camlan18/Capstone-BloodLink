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
