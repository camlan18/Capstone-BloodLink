import { BadRequestException } from '@nestjs/common';
import { MasterDataService } from '../master-data.service';
import { expectErr, errOf } from './_helpers';

describe('MD-002 MasterDataService blood types CRUD', () => {
  let prisma: any; let service: MasterDataService;
  beforeEach(() => {
    prisma = { blood_types: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ blood_type_id: 1 }),
      update: jest.fn().mockResolvedValue({ blood_type_id: 1 }) } };
    service = new MasterDataService(prisma as any);
  });
  it('UTCID01 list default', async () => {
    prisma.blood_types.findMany.mockResolvedValue(new Array(8).fill({}));
    prisma.blood_types.count.mockResolvedValue(8);
    const r = await service.getBloodTypes({} as any);
    expect(r.data).toHaveLength(8);
    expect(r.meta).toEqual({ total: 8, page: 1, limit: 20, totalPages: 1 });
    expect(prisma.blood_types.findMany.mock.calls[0][0].orderBy).toEqual({ display_order: 'asc' });
  });
  it('UTCID02 list filtered', async () => {
    prisma.blood_types.findMany.mockResolvedValue([{}]);
    await service.getBloodTypes({ search: 'A', is_active: true } as any);
    expect(prisma.blood_types.findMany.mock.calls[0][0].where).toEqual({ is_active: true, abo: { contains: 'A' } });
  });
  it('UTCID03 create A+', async () => {
    expect(await service.createBloodType({ blood_group: 'A', rh_factor: '+' } as any)).toEqual({ blood_type_id: 1 });
    expect(prisma.blood_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ blood_type_code: 'APOS', display_order: 0 }) });
  });
  it('UTCID04 create O-', async () => {
    await service.createBloodType({ blood_group: 'O', rh_factor: '-' } as any);
    expect(prisma.blood_types.create).toHaveBeenCalledWith({ data: expect.objectContaining({ blood_type_code: 'ONEG' }) });
  });
  it('UTCID05 create duplicate', async () => {
    prisma.blood_types.findFirst.mockResolvedValue({ blood_type_id: 3 });
    await expectErr(service.createBloodType({ blood_group: 'A', rh_factor: '+' } as any), BadRequestException, 'Nhóm máu này đã tồn tại');
    expect(prisma.blood_types.create).not.toHaveBeenCalled();
  });
  it('UTCID06 update rh only has no abo key', async () => {
    expect(await service.updateBloodType(1, { rh_factor: '-' } as any)).toEqual({ blood_type_id: 1 });
    expect(prisma.blood_types.update.mock.calls[0][0].data).not.toHaveProperty('abo');
  });
  it('UTCID07 update P2025 propagates', async () => {
    const err = Object.assign(new Error('P2025'), { code: 'P2025' });
    prisma.blood_types.update.mockRejectedValue(err);
    expect(await errOf(service.updateBloodType(999, { blood_group: 'A', rh_factor: '+' } as any))).toBe(err);
    expect(prisma.blood_types.update).toHaveBeenCalledTimes(1);
  });
  it('UTCID08 soft delete', async () => {
    prisma.blood_types.update.mockResolvedValue({ blood_type_id: 1, is_active: false });
    expect(await service.deleteBloodType(1)).toEqual({ blood_type_id: 1, is_active: false });
    expect(prisma.blood_types.update).toHaveBeenCalledWith({ where: { blood_type_id: 1 }, data: { is_active: false } });
  });
});
