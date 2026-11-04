import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-001 MasterDataService blood components CRUD', () => {
  let prisma: any; let service: MasterDataService;
  beforeEach(() => {
    prisma = { blood_components: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ component_id: 1 }), update: jest.fn().mockResolvedValue({ component_id: 1 }) } };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list dropdown (no query)', async () => {
    prisma.blood_components.findMany.mockResolvedValue([{}, {}, {}]);
    const r = await service.getBloodComponents(undefined);
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(3);
    expect(prisma.blood_components.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { is_active: true }, include: { interval_rules: true } }));
    expect(prisma.blood_components.count).not.toHaveBeenCalled();
  });
  it('UTCID02 list dropdown (empty query)', async () => {
    prisma.blood_components.findMany.mockResolvedValue([{}, {}, {}]);
    const r = await service.getBloodComponents({} as any);
    expect(r).toHaveLength(3);
    expect(prisma.blood_components.count).not.toHaveBeenCalled();
  });
  it('UTCID03 paginated with search', async () => {
    prisma.blood_components.count.mockResolvedValue(3);
    const r: any = await service.getBloodComponents({ page: 1, search: 'Hồng' } as any);
    expect(r.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blood_components.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { component_name: { contains: 'Hồng' } }, orderBy: { component_id: 'asc' } }));
  });
  it('UTCID04 create ok', async () => {
    prisma.blood_components.findFirst.mockResolvedValue(null);
    expect(await service.createBloodComponent({ component_code: 'RBC', component_name: 'x' } as any)).toEqual({ component_id: 1 });
    expect(prisma.blood_components.create).toHaveBeenCalled();
  });
  it('UTCID05 create duplicate code', async () => {
    prisma.blood_components.findFirst.mockResolvedValue({ component_id: 2 });
    await expectErr(service.createBloodComponent({ component_code: 'RBC' } as any), BadRequestException, 'Mã thành phần máu này đã tồn tại');
    expect(prisma.blood_components.create).not.toHaveBeenCalled();
  });
  it('UTCID06 update ok', async () => {
    expect(await service.updateBloodComponent(1, { component_code: 'RBC' } as any)).toEqual({ component_id: 1 });
    expect(prisma.blood_components.update).toHaveBeenCalledWith(expect.objectContaining({ where: { component_id: 1 } }));
  });
  it('UTCID07 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_components.update.mockRejectedValue(err);
    expect(await errOf(service.updateBloodComponent(999, { component_code: 'RBC' } as any))).toBe(err);
    expect(prisma.blood_components.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID08 soft delete', async () => {
    prisma.blood_components.update.mockResolvedValue({ component_id: 1, is_active: false });
    expect(await service.deleteBloodComponent(1)).toEqual({ component_id: 1, is_active: false });
    expect(prisma.blood_components.update).toHaveBeenCalledWith({ where: { component_id: 1 }, data: { is_active: false } });
  });
  it('UTCID09 delete P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_components.update.mockRejectedValue(err);
    expect(await errOf(service.deleteBloodComponent(999))).toBe(err);
    expect(prisma.blood_components.update).toHaveBeenCalledTimes(1);
  });
});
