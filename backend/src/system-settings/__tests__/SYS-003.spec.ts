import { NotFoundException } from '@nestjs/common';
import { SystemSettingsService } from '../system-settings.service';

describe('SYS-003 SystemSettingsService.deleteSetting', () => {
  let prisma: any, service: SystemSettingsService;
  beforeEach(() => {
    prisma = { system_settings: { findUnique: jest.fn(), delete: jest.fn() } };
    service = new SystemSettingsService(prisma as any);
  });

  it('UTCID01 delete existing', async () => {
    prisma.system_settings.findUnique.mockResolvedValue({ setting_id: 1 });
    prisma.system_settings.delete.mockResolvedValue({ setting_id: 1 });
    await expect(service.deleteSetting(1)).resolves.toEqual({ setting_id: 1 });
    expect(prisma.system_settings.delete).toHaveBeenCalledWith({ where: { setting_id: 1 } });
  });

  it('UTCID02 not found', async () => {
    prisma.system_settings.findUnique.mockResolvedValue(null);
    const p = service.deleteSetting(999);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy cấu hình này');
    expect(prisma.system_settings.delete).not.toHaveBeenCalled();
  });

  it('UTCID03 id 0 not found', async () => {
    prisma.system_settings.findUnique.mockResolvedValue(null);
    const p = service.deleteSetting(0);
    await expect(p).rejects.toThrow(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy cấu hình này');
    expect(prisma.system_settings.delete).not.toHaveBeenCalled();
  });
});
