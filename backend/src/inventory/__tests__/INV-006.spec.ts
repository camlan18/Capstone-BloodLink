import { InventoryService } from '../inventory.service';
import { ExcelUtil } from '../../common/utils/excel.util';

describe('INV-006 InventoryService.importExcel', () => {
  let prisma: any, service: InventoryService, parse: jest.SpyInstance;
  const buf = Buffer.from('x');
  const row = (o: any = {}) => ({
    'Mã cơ sở (ID)': 1,
    'Mã nhóm máu (ID)': 1,
    'Mã thành phần (ID)': 1,
    'Mã túi máu': 'BAG-001',
    'Thể tích (ml)': 350,
    'Ngày lấy (YYYY-MM-DD)': '2026-10-01',
    'Ngày hết hạn (YYYY-MM-DD)': '2026-12-01',
    ...o,
  });

  beforeEach(() => {
    prisma = {
      users: { findUnique: jest.fn().mockResolvedValue({ user_id: 2, facility_id: null, role: { role_code: 'ADMIN' } }) },
      blood_inventory: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ inventory_id: 10 }),
      },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    parse = jest.spyOn(ExcelUtil, 'parseExcel');
    service = new InventoryService(prisma as any, {} as any);
  });
  afterEach(() => parse.mockRestore());

  it('UTCID01 two valid rows', async () => {
    parse.mockReturnValue([row(), row({ 'Mã túi máu': 'BAG-002' })]);
    const res = await service.importExcel(buf, 2);
    expect(res).toEqual({ message: 'Import hoàn tất. Thành công: 2, Thất bại/Bỏ qua: 0' });
    expect(prisma.blood_inventory.create).toHaveBeenCalledTimes(2);
    expect(prisma.blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status_code: 'AVAILABLE' }) });
    expect(prisma.inventory_transactions.create).toHaveBeenCalledTimes(2);
    expect(prisma.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ transaction_type: 'IN' }) });
  });

  it('UTCID02 staff facility overrides row', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 5, facility_id: 1, role: { role_code: 'HOSPITAL_STAFF' } });
    parse.mockReturnValue([row({ 'Mã cơ sở (ID)': 3 })]);
    const res = await service.importExcel(buf, 5);
    expect(res.message).toContain('Thành công: 1, Thất bại/Bỏ qua: 0');
    expect(prisma.blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID03 missing bag code', async () => {
    parse.mockReturnValue([row({ 'Mã túi máu': undefined })]);
    const res = await service.importExcel(buf, 2);
    expect(res.message).toContain('Thành công: 0, Thất bại/Bỏ qua: 1');
    expect(prisma.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID04 volume 0', async () => {
    parse.mockReturnValue([row({ 'Thể tích (ml)': 0 })]);
    const res = await service.importExcel(buf, 2);
    expect(res.message).toContain('Thành công: 0, Thất bại/Bỏ qua: 1');
    expect(prisma.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID05 duplicate bag_code', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ inventory_id: 99 });
    parse.mockReturnValue([row()]);
    const res = await service.importExcel(buf, 2);
    expect(res.message).toContain('Thành công: 0, Thất bại/Bỏ qua: 1');
    expect(prisma.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID06 create rejects on row 2', async () => {
    prisma.blood_inventory.create.mockResolvedValueOnce({ inventory_id: 10 }).mockRejectedValueOnce(new Error('db'));
    parse.mockReturnValue([row(), row({ 'Mã túi máu': 'BAG-002' })]);
    const res = await service.importExcel(buf, 2);
    expect(res.message).toContain('Thành công: 1, Thất bại/Bỏ qua: 1');
    expect(prisma.inventory_transactions.create).toHaveBeenCalledTimes(1);
  });

  it('UTCID07 empty file', async () => {
    parse.mockReturnValue([]);
    const res = await service.importExcel(buf, 2);
    expect(res.message).toContain('Thành công: 0, Thất bại/Bỏ qua: 0');
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
    expect(prisma.blood_inventory.findUnique).not.toHaveBeenCalled();
    expect(prisma.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID08 staff without facility', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_id: 7, facility_id: null, role: { role_code: 'HOSPITAL_STAFF' } });
    prisma.blood_inventory.create.mockRejectedValue(new Error('FK'));
    parse.mockReturnValue([row()]);
    const res = await service.importExcel(buf, 7);
    expect(res.message).toContain('Thành công: 0, Thất bại/Bỏ qua: 1');
    expect(prisma.blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: -1 }) });
  });
});
