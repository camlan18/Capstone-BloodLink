import { UsersService } from '../users.service';

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
});
