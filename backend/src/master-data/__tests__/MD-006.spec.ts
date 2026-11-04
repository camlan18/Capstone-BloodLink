import { MasterDataService } from '../master-data.service';

describe('MD-006 MasterDataService lookups', () => {
  let prisma: any; let service: MasterDataService;
  beforeEach(() => {
    prisma = { urgency_levels: { findMany: jest.fn() }, roles: { findMany: jest.fn() },
      provinces: { findMany: jest.fn() }, wards: { findMany: jest.fn() } };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 urgency levels', async () => {
    prisma.urgency_levels.findMany.mockResolvedValue([{}, {}, {}]);
    expect(await service.getUrgencyLevels()).toHaveLength(3);
    expect(prisma.urgency_levels.findMany).toHaveBeenCalledWith({ orderBy: { priority_level: 'asc' } });
  });
  it('UTCID02 roles', async () => {
    prisma.roles.findMany.mockResolvedValue([{}]);
    expect(await service.getRoles()).toHaveLength(1);
    expect(prisma.roles.findMany).toHaveBeenCalledWith({ where: { is_active: true } });
  });
  it('UTCID03 provinces', async () => {
    prisma.provinces.findMany.mockResolvedValue(new Array(34).fill({}));
    expect(await service.getProvinces()).toHaveLength(34);
    expect(prisma.provinces.findMany).toHaveBeenCalledWith({ orderBy: { province_name: 'asc' } });
  });
  it('UTCID04 wards of province 1', async () => {
    prisma.wards.findMany.mockResolvedValue([{}, {}]);
    expect(await service.getWards(1)).toHaveLength(2);
    expect(prisma.wards.findMany).toHaveBeenCalledWith({ where: { province_id: 1 }, orderBy: { ward_name: 'asc' } });
  });
  it('UTCID05 wards of unknown province', async () => {
    prisma.wards.findMany.mockResolvedValue([]);
    expect(await service.getWards(999)).toEqual([]);
  });
});
