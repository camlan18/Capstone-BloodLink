import { MasterDataService } from '../master-data.service';
import { ExcelUtil } from '../../common/utils/excel.util';
import { errOf } from './_helpers';

describe('MD-007 MasterDataService.importFacilitiesExcel', () => {
  let prisma: any; let service: MasterDataService; let mf: any; let parse: jest.SpyInstance;
  const base = (o: any = {}) => ({ 'Tên cơ sở': 'BV A', 'Địa chỉ': 'HN', ...o });
  const msg = (s: number, f: number) => ({ message: `Import hoàn tất. Thành công: ${s}, Thất bại/Bỏ qua: ${f}` });
  beforeEach(() => {
    mf = { updateMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) };
    prisma = { medical_facilities: mf };
    service = new MasterDataService(prisma as any);
    parse = jest.spyOn(ExcelUtil, 'parseExcel');
  });
  afterEach(() => parse.mockRestore());

  it('UTCID01 two valid rows', async () => {
    parse.mockReturnValue([base({ 'Mã cơ sở': 'BV1' }), base({ 'Mã cơ sở': 'BV1' })]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(2, 0));
    expect(mf.create).toHaveBeenCalledTimes(2);
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_active: true, is_primary: false }) });
  });
  it('UTCID02 empty', async () => {
    parse.mockReturnValue([]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(0, 0));
    expect(mf.create).not.toHaveBeenCalled();
    expect(mf.updateMany).not.toHaveBeenCalled();
  });
  it('UTCID03 missing address', async () => {
    parse.mockReturnValue([{ 'Tên cơ sở': 'BV A' }]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(0, 1));
    expect(mf.create).not.toHaveBeenCalled();
  });
  it('UTCID04 missing code generates one', async () => {
    parse.mockReturnValue([base()]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(1, 0));
    expect(mf.create.mock.calls[0][0].data.facility_code).toMatch(/^FAC-\d+-\d+$/);
  });
  it('UTCID05 primary as number 1', async () => {
    parse.mockReturnValue([base({ 'Cơ sở chính (1/0)': 1 })]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(1, 0));
    expect(mf.updateMany).toHaveBeenCalledWith({ where: { is_primary: true }, data: { is_primary: false } });
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_primary: true }) });
  });
  it('UTCID06 primary as string "1"', async () => {
    parse.mockReturnValue([base({ 'Cơ sở chính (1/0)': '1' })]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(1, 0));
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_primary: true }) });
  });
  it('UTCID07 primary 0', async () => {
    parse.mockReturnValue([base({ 'Cơ sở chính (1/0)': 0 })]);
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(1, 0));
    expect(mf.updateMany).not.toHaveBeenCalled();
    expect(mf.create).toHaveBeenCalledWith({ data: expect.objectContaining({ is_primary: false }) });
  });
  it('UTCID08 second row create fails, loop continues', async () => {
    parse.mockReturnValue([base({ 'Mã cơ sở': 'A' }), base({ 'Mã cơ sở': 'A' })]);
    mf.create.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error('Unique'), { code: 'P2002' }));
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(1, 1));
  });
  it('UTCID09 primary row fails after old primary cleared', async () => {
    parse.mockReturnValue([base({ 'Cơ sở chính (1/0)': 1 })]);
    mf.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    expect(await service.importFacilitiesExcel(Buffer.from(''))).toEqual(msg(0, 1));
    expect(mf.updateMany).toHaveBeenCalled();
  });
  it('UTCID10 corrupt file rejects', async () => {
    const err = new Error('Unsupported file');
    parse.mockImplementation(() => { throw err; });
    expect(await errOf(service.importFacilitiesExcel(Buffer.from('bad')))).toBe(err);
    expect(mf.create).not.toHaveBeenCalled();
    expect(mf.updateMany).not.toHaveBeenCalled();
  });
});
