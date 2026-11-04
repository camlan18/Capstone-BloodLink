import { BadRequestException } from '@nestjs/common';
import { UsersService } from '../users.service';

describe('USR-003 UsersService.uploadAvatar', () => {
  let prisma: any, cloud: any, service: UsersService;
  const file: any = { buffer: Buffer.from('x'), mimetype: 'image/png' };
  beforeEach(() => {
    prisma = { users: { update: jest.fn().mockResolvedValue({ user_id: 1, avatar_url: 'https://res/x.png', password_hash: 'x' }) } };
    cloud = { uploadFile: jest.fn().mockResolvedValue({ secure_url: 'https://res/x.png' }) };
    service = new UsersService(prisma as any, cloud as any, {} as any, {} as any);
  });

  it('UTCID01 upload success', async () => {
    const res: any = await service.uploadAvatar(1, file);
    expect(res.avatar_url).toBe('https://res/x.png');
    expect(res.password_hash).toBeUndefined();
    expect(cloud.uploadFile).toHaveBeenCalledWith(file);
    expect(prisma.users.update).toHaveBeenCalledWith({ where: { user_id: 1 }, data: { avatar_url: 'https://res/x.png' } });
  });

  it('UTCID02 no file', async () => {
    const p = service.uploadAvatar(1, undefined as any);
    await expect(p).rejects.toThrow(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn ảnh');
    expect(cloud.uploadFile).not.toHaveBeenCalled();
  });

  it('UTCID03 cloudinary failure propagates', async () => {
    cloud.uploadFile.mockRejectedValue(new Error('network'));
    await expect(service.uploadAvatar(1, file)).rejects.toThrow('network');
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it('UTCID04 db update failure propagates after upload', async () => {
    prisma.users.update.mockRejectedValue(Object.assign(new Error('Record not found'), { code: 'P2025' }));
    await expect(service.uploadAvatar(999, file)).rejects.toThrow('Record not found');
    expect(cloud.uploadFile).toHaveBeenCalled();
  });
});
