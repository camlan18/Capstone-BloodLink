import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SystemSettingsService } from '../system-settings.service';
import { UpsertSettingDto } from '../dto/system-settings.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = { setting_key: 'max_image_upload_size_mb', setting_value: '5', description: 'Dung lượng ảnh' };
const runDto = (value: any) => dtoPipe.transform(value, { type: 'body', metatype: UpsertSettingDto, data: '' });

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

  it('UTCID05 DTO: setting_key empty', async () => {
    const err = await runDto({ ...dtoValid, setting_key: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("setting_key should not be empty");
  });

  it('UTCID06 DTO: setting_key not in SystemSettingKey', async () => {
    const err = await runDto({ ...dtoValid, setting_key: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Khóa cài đặt không hợp lệ");
  });

  it('UTCID07 DTO: setting_key max_search_radius_km rejected', async () => {
    const err = await runDto({ ...dtoValid, setting_key: 'max_search_radius_km' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("Khóa cài đặt không hợp lệ");
  });

  it('UTCID08 DTO: setting_key uppercase lower-cased and accepted', async () => {
    await expect(runDto({ ...dtoValid, setting_key: 'MAX_IMAGE_UPLOAD_SIZE_MB' })).resolves.toEqual(expect.objectContaining({ setting_key: 'max_image_upload_size_mb' }));
  });

  it('UTCID09 DTO: setting_value empty', async () => {
    const err = await runDto({ ...dtoValid, setting_value: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("setting_value should not be empty");
  });

  it('UTCID10 DTO: setting_value not a string', async () => {
    const err = await runDto({ ...dtoValid, setting_value: 5 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("setting_value must be a string");
  });

  it('UTCID11 DTO: description 500 chars accepted', async () => {
    await expect(runDto({ ...dtoValid, description: 'a'.repeat(500) })).resolves.toEqual(expect.objectContaining({ description: 'a'.repeat(500) }));
  });

  it('UTCID12 DTO: description 501 chars rejected', async () => {
    const err = await runDto({ ...dtoValid, description: 'a'.repeat(501) }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("description must be shorter than or equal to 500 characters");
  });

  it('UTCID13 DTO: unknown property stripped by whitelist', async () => {
    const res = await runDto({ ...dtoValid, setting_id: 99 });
    expect(res).toEqual(expect.objectContaining(dtoValid));
    expect(res).not.toHaveProperty('setting_id');
  });
});
