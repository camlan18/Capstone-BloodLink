import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-002 TransferService.approveTransfer', () => {
  let prisma: any, tx: any, service: TransferService;
  const staff = { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const transfer = (o: any = {}) => ({ transfer_id: 1, status: 'PENDING', from_facility_id: 1, inventory_id: null, ...o });
  const bag = (id: number, o: any = {}) => ({ inventory_id: id, facility_id: 1, status_code: 'AVAILABLE', bag_code: `B${id}`, volume_ml: 350, ...o });

  beforeEach(() => {
    tx = {
      blood_inventory: {
        findUnique: jest.fn(async ({ where }: any) => bag(where.inventory_id)),
        update: jest.fn().mockResolvedValue({}),
      },
      blood_transfers: { update: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'APPROVED' }) },
    };
    prisma = {
      blood_transfers: { findUnique: jest.fn().mockResolvedValue(transfer()) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 approve with two bags', async () => {
    const res = await service.approveTransfer(1, staff, [10, 11]);
    expect(res).toEqual({ data: { transfer_id: 1, status: 'APPROVED' }, message: 'Đã duyệt phiếu chuyển máu. Tiến hành xuất kho.' });
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'ALLOCATED' } }));
    const data = tx.blood_transfers.update.mock.calls[0][0].data;
    expect(data.status).toBe('APPROVED');
    expect(data.approved_by).toBe(5);
    expect(data.inventory_id).toBe(10);
    expect(JSON.parse(data.inventory_ids)).toHaveLength(2);
  });

  it('UTCID02 fallback to transfer.inventory_id', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_id: 10 }));
    const res = await service.approveTransfer(1, admin, undefined);
    expect(res.data.status).toBe('APPROVED');
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(1);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { inventory_id: 10 } }));
  });

  it('UTCID03 approval without bags', async () => {
    const res = await service.approveTransfer(1, admin, []);
    expect(res.data.status).toBe('APPROVED');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    const data = tx.blood_transfers.update.mock.calls[0][0].data;
    expect(data.inventory_id).toBeNull();
    expect(data.inventory_ids).toBe('[]');
  });

  it('UTCID04 transfer not found', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(null);
    const p = service.approveTransfer(999, admin, [10]);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID05 not PENDING', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(transfer({ status: 'APPROVED' }));
    const p = service.approveTransfer(1, admin, [10]);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái APPROVED, không thể duyệt');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID06 bag not found', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(null);
    const p = service.approveTransfer(1, admin, [99]);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu ID 99 không tồn tại');
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID07 bag in other facility', async () => {
    tx.blood_inventory.findUnique.mockResolvedValue(bag(20, { facility_id: 2 }));
    const p = service.approveTransfer(1, admin, [20]);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu ID 20 không thuộc cơ sở xuất');
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID08 second bag RESERVED', async () => {
    tx.blood_inventory.findUnique.mockImplementation(async ({ where }: any) => bag(where.inventory_id, where.inventory_id === 11 ? { status_code: 'RESERVED' } : {}));
    const p = service.approveTransfer(1, admin, [10, 11]);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu ID 11 đang ở trạng thái RESERVED, không thể chuyển');
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID09 staff of another facility can approve', async () => {
    const res = await service.approveTransfer(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 }, [10]);
    expect(res.data.status).toBe('APPROVED');
    expect(tx.blood_transfers.update.mock.calls[0][0].data.approved_by).toBe(6);
  });

  it('UTCID10 no bag count/blood type check', async () => {
    tx.blood_inventory.findUnique.mockImplementation(async ({ where }: any) => bag(where.inventory_id, { blood_type_id: 2 }));
    const res = await service.approveTransfer(1, admin, [10, 11]);
    expect(res.data.status).toBe('APPROVED');
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
  });
});
