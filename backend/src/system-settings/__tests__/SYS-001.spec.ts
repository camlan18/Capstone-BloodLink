import { SystemSettingsService } from '../system-settings.service';

describe('SYS-001 SystemSettingsService.getSettings', () => {
  let prisma: any, service: SystemSettingsService;
  const setup = (rows: any[], count: number) => {
    prisma.system_settings.findMany.mockResolvedValue(rows);
    prisma.system_settings.count.mockResolvedValue(count);
  };
  beforeEach(() => {
    prisma = { system_settings: { findMany: jest.fn(), count: jest.fn() } };
    service = new SystemSettingsService(prisma as any);
  });

  it('UTCID01 default paging', async () => {
    setup([{}], 4);
    const res = await service.getSettings({});
    expect(res.meta).toEqual({ total: 4, page: 1, limit: 50, totalPages: 1 });
    expect(prisma.system_settings.findMany).toHaveBeenCalledWith({ where: {}, orderBy: { updated_at: 'desc' }, skip: 0, take: 50 });
  });

  it('UTCID02 search', async () => {
    setup([{}], 1);
    await service.getSettings({ search: 'radius' });
    expect(prisma.system_settings.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ setting_key: { contains: 'radius' } }, { description: { contains: 'radius' } }] },
    }));
  });

  it('UTCID03 page 2 limit 10', async () => {
    setup([], 25);
    const res = await service.getSettings({ page: '2', limit: '10' });
    expect(res.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(prisma.system_settings.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('UTCID04 zero page/limit fall back', async () => {
    setup([], 4);
    const res = await service.getSettings({ page: '0', limit: '0' });
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(50);
    expect(prisma.system_settings.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 50 }));
  });

  it('UTCID05 empty', async () => {
    setup([], 0);
    const res = await service.getSettings({});
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(res.meta.totalPages).toBe(0);
  });
});
