import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UserFilterDto } from '../dto/user-filter.dto';

// DTO validation helpers (mirrors main.ts: new ValidationPipe({ whitelist: true, transform: true }))
const dtoPipe = new ValidationPipe({ whitelist: true, transform: true });
const dtoValid: any = {};
const runDto = (value: any) => dtoPipe.transform(value, { type: 'query', metatype: UserFilterDto, data: '' });

describe('USR-004 UsersService.getAllUsers', () => {
  let prisma: any, service: UsersService;
  const setup = (rows: any[], count: number) => {
    prisma.users.findMany.mockResolvedValue(rows);
    prisma.users.count.mockResolvedValue(count);
  };
  beforeEach(() => {
    prisma = { users: { findMany: jest.fn(), count: jest.fn() } };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 default paging', async () => {
    setup([{ user_id: 1, is_active: true, is_email_verified: true, last_login_at: new Date() }], 3);
    const res = await service.getAllUsers({} as any);
    expect(res.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.users.findMany).toHaveBeenCalledWith({ where: {}, skip: 0, take: 20, include: { role: true }, orderBy: { created_at: 'desc' } });
  });

  it('UTCID02 page 2 limit 10', async () => {
    setup([], 25);
    const res = await service.getAllUsers({ page: 2, limit: 10 } as any);
    expect(res.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(prisma.users.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('UTCID03 role and active filters', async () => {
    setup([], 1);
    await service.getAllUsers({ role_id: 2, is_active: false } as any);
    expect(prisma.users.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role_id: 2, is_active: false } }));
  });

  it('UTCID04 search filter', async () => {
    setup([], 1);
    await service.getAllUsers({ search: 'an' } as any);
    expect(prisma.users.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ email: { contains: 'an' } }, { full_name: { contains: 'an' } }, { phone: { contains: 'an' } }] },
    }));
  });

  it('UTCID05 sortBy without sortOrder', async () => {
    setup([], 1);
    await service.getAllUsers({ sortBy: 'email' } as any);
    expect(prisma.users.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { email: 'desc' } }));
  });

  it('UTCID06 locked user status', async () => {
    setup([{ user_id: 1, password_hash: 'x', is_active: false, is_email_verified: true }], 1);
    const res: any = await service.getAllUsers({} as any);
    expect(res.data[0].computed_status).toBe('Bị khóa');
    expect(res.data[0].password_hash).toBeUndefined();
  });

  it('UTCID07 unverified status', async () => {
    setup([{ user_id: 1, is_active: true, is_email_verified: false }], 1);
    const res: any = await service.getAllUsers({} as any);
    expect(res.data[0].computed_status).toBe('Chưa xác thực');
  });

  it('UTCID08 never logged in status', async () => {
    setup([{ user_id: 1, is_active: true, is_email_verified: true, last_login_at: null }], 1);
    const res: any = await service.getAllUsers({} as any);
    expect(res.data[0].computed_status).toBe('Chưa hoạt động');
  });

  it('UTCID09 active status', async () => {
    setup([{ user_id: 1, is_active: true, is_email_verified: true, last_login_at: new Date() }], 1);
    const res: any = await service.getAllUsers({} as any);
    expect(res.data[0].computed_status).toBe('Đang hoạt động');
  });

  it('UTCID10 empty result', async () => {
    setup([], 0);
    const res = await service.getAllUsers({} as any);
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(res.meta.totalPages).toBe(0);
  });

  it('UTCID11 DTO: page 0 rejected', async () => {
    const err = await runDto({ ...dtoValid, page: '0' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("page must not be less than 1");
  });

  it('UTCID12 DTO: page 1 accepted and converted to number', async () => {
    await expect(runDto({ ...dtoValid, page: '1' })).resolves.toEqual(expect.objectContaining({ page: 1 }));
  });

  it('UTCID13 DTO: page not an integer', async () => {
    const err = await runDto({ ...dtoValid, page: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("page must be an integer number");
  });

  it('UTCID14 DTO: limit 0 rejected', async () => {
    const err = await runDto({ ...dtoValid, limit: '0' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("limit must not be less than 1");
  });

  it('UTCID15 DTO: limit 1 accepted', async () => {
    await expect(runDto({ ...dtoValid, limit: '1' })).resolves.toEqual(expect.objectContaining({ limit: 1 }));
  });

  it('UTCID16 DTO: role_id not an integer', async () => {
    const err = await runDto({ ...dtoValid, role_id: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("role_id must be an integer number");
  });

  it('UTCID17 DTO: sortOrder not in enum', async () => {
    const err = await runDto({ ...dtoValid, sortOrder: 'up' }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("sortOrder must be one of the following values: asc, desc");
  });

  it('UTCID18 DTO: is_active string false converted to boolean false', async () => {
    await expect(runDto({ ...dtoValid, is_active: 'false' })).resolves.toEqual(expect.objectContaining({ is_active: false }));
  });

  it('UTCID19 DTO: search not a string', async () => {
    const err = await runDto({ ...dtoValid, search: 123 }).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse().message).toContain("search must be a string");
  });
});
