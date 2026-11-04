import { SystemSettingsService } from '../system-settings.service';

describe('SYS-002 SystemSettingsService.upsertSetting', () => {
  let prisma: any, service: SystemSettingsService;
  const NOW = new Date('2026-11-03T08:00:00Z');
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    prisma = { system_settings: {
      findUnique: jest.fn().mockResolvedValue({ setting_id: 1 }),
      update: jest.fn().mockResolvedValue({ setting_id: 1, updated: true }),
      create: jest.fn().mockResolvedValue({ setting_id: 2, created: true }),
    } };
    service = new SystemSettingsService(prisma as any);
  });
  afterEach(() => jest.useRealTimers());
  const dto = (o: any = {}) => ({ setting_key: 'max_search_radius_km', setting_value: '20', description: 'Bán kính', ...o }) as any;

  it('UTCID01 update existing', async () => {
    const res: any = await service.upsertSetting(dto());
    expect(res.updated).toBe(true);
    expect(prisma.system_settings.update).toHaveBeenCalledWith({
      where: { setting_key: 'max_search_radius_km' }, data: { setting_value: '20', description: 'Bán kính', updated_at: NOW },
    });
    expect(prisma.system_settings.create).not.toHaveBeenCalled();
  });

  it('UTCID02 create new', async () => {
    prisma.system_settings.findUnique.mockResolvedValue(null);
    const res: any = await service.upsertSetting(dto());
    expect(res.created).toBe(true);
    expect(prisma.system_settings.create).toHaveBeenCalledWith({
      data: { setting_key: 'max_search_radius_km', setting_value: '20', description: 'Bán kính', updated_at: NOW },
    });
    expect(prisma.system_settings.update).not.toHaveBeenCalled();
  });

  it('UTCID03 update without description', async () => {
    const res: any = await service.upsertSetting(dto({ description: undefined }));
    expect(res.updated).toBe(true);
    expect(prisma.system_settings.update).toHaveBeenCalledWith({
      where: { setting_key: 'max_search_radius_km' }, data: expect.objectContaining({ description: undefined }),
    });
  });

  it('UTCID04 concurrent insert error propagates', async () => {
    prisma.system_settings.findUnique.mockResolvedValue(null);
    prisma.system_settings.create.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));
    await expect(service.upsertSetting(dto())).rejects.toThrow('Unique constraint');
    expect(prisma.system_settings.create).toHaveBeenCalled();
  });
});
