import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
import { ExcelUtil } from '../../common/utils/excel.util';
jest.mock('bcrypt');
jest.mock('../../common/utils/excel.util');

describe('USR-010 UsersService.importExcel', () => {
  let prisma: any, service: UsersService;
  const row = (o: any = {}) => ({ Email: 'u1@test.vn', 'Họ tên': 'User Mot', 'Role (ID)': 2, ...o });
  const buf = Buffer.from('x');
  const msg = (s: number, f: number) => ({ message: `Import hoàn tất. Thành công: ${s}, Thất bại/Bỏ qua: ${f}` });
  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma = { users: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) } };
    service = new UsersService(prisma as any, {} as any, {} as any, {} as any);
  });
  const rows = (r: any[]) => (ExcelUtil.parseExcel as jest.Mock).mockReturnValue(r);

  it('UTCID01 import one row with default password', async () => {
    rows([row()]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(1, 0));
    expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(prisma.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_active: true, gender: 'O' }) });
  });

  it('UTCID02 import with password, gender and facility', async () => {
    rows([row({ 'Mật khẩu': 'Pw@999', 'Giới tính (M/F)': 'F', 'Facility (ID)': 1 })]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(1, 0));
    expect(bcrypt.hash).toHaveBeenCalledWith('Pw@999', 10);
    expect(prisma.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ gender: 'F', facility_id: 1 }) });
  });

  it('UTCID03 missing email', async () => {
    rows([{ 'Họ tên': 'User Mot', 'Role (ID)': 2 }]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(0, 1));
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID04 invalid role id', async () => {
    rows([row({ 'Role (ID)': 'abc' })]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(0, 1));
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('UTCID05 email already exists', async () => {
    rows([row()]);
    prisma.users.findUnique.mockResolvedValue({ user_id: 1 });
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(0, 1));
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('UTCID06 create error swallowed', async () => {
    rows([row()]);
    prisma.users.create.mockRejectedValue(new Error('FK role'));
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(0, 1));
    expect(prisma.users.create).toHaveBeenCalledTimes(1);
  });

  it('UTCID07 mixed rows', async () => {
    rows([row(), row({ Email: 'dup@test.vn' }), { Email: 'x@test.vn', 'Role (ID)': 2 }]);
    prisma.users.findUnique.mockImplementation(async ({ where }: any) => (where.email === 'dup@test.vn' ? { user_id: 9 } : null));
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(1, 2));
    expect(prisma.users.create).toHaveBeenCalledTimes(1);
  });

  it('UTCID08 facility id 0 -> null', async () => {
    rows([row({ 'Facility (ID)': 0 })]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(1, 0));
    expect(prisma.users.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: null }) });
  });

  it('UTCID09 empty sheet', async () => {
    rows([]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(0, 0));
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('UTCID10 imported users have no is_email_verified', async () => {
    rows([row()]);
    await expect(service.importExcel(buf, 1)).resolves.toEqual(msg(1, 0));
    const data = prisma.users.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('is_email_verified');
  });
});
