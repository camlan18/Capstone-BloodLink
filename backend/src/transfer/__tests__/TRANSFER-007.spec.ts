import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-007 TransferService.cancelTransfer', () => {
  let prisma: any, tx: any, service: TransferService, bags: Record<number, any>;
  const staff = { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const tr = (status: string, o: any = {}) => ({ transfer_id: 1, status, inventory_ids: null, inventory_id: null, ...o });
  const noWrite = () => {
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    bags = { 10: { inventory_id: 10, status_code: 'ALLOCATED' }, 11: { inventory_id: 11, status_code: 'ALLOCATED' } };
    tx = {
      blood_transfers: {
        findUnique: jest.fn().mockResolvedValue(tr('PENDING')),
        update: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'CANCELLED' }),
      },
      blood_inventory: {
        findUnique: jest.fn(async ({ where }: any) => bags[where.inventory_id] ?? null),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 cancel PENDING', async () => {
    const res = await service.cancelTransfer(1, staff);
    expect(res).toEqual({ data: { transfer_id: 1, status: 'CANCELLED' }, message: 'Đã hủy phiếu chuyển máu.' });
    expect(tx.blood_inventory.findUnique).not.toHaveBeenCalled();
    expect(tx.blood_transfers.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }));
  });

  it('UTCID02 cancel APPROVED releases bags', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(tr('APPROVED', { inventory_ids: JSON.stringify([{ id: 10 }, { id: 11 }]) }));
    const res = await service.cancelTransfer(1, staff);
    expect(res.data.status).toBe('CANCELLED');
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'AVAILABLE' } }));
  });

  it('UTCID03 only ALLOCATED bags released', async () => {
    bags[11].status_code = 'RESERVED';
    tx.blood_transfers.findUnique.mockResolvedValue(tr('APPROVED', { inventory_ids: JSON.stringify([{ id: 10 }, { id: 11 }]) }));
    const res = await service.cancelTransfer(1, staff);
    expect(res.data.status).toBe('CANCELLED');
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(1);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { inventory_id: 10 } }));
  });

  it('UTCID04 fallback to inventory_id', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(tr('APPROVED', { inventory_id: 10 }));
    const res = await service.cancelTransfer(1, staff);
    expect(res.data.status).toBe('CANCELLED');
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { inventory_id: 10 } }));
  });

  it('UTCID05 bag not found', async () => {
    delete bags[10];
    tx.blood_transfers.findUnique.mockResolvedValue(tr('APPROVED', { inventory_ids: JSON.stringify([{ id: 10 }]) }));
    const res = await service.cancelTransfer(1, staff);
    expect(res.data.status).toBe('CANCELLED');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID06 transfer not found', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(null);
    const p = service.cancelTransfer(999, staff);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    noWrite();
  });

  it('UTCID07 IN_TRANSIT rejected', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(tr('IN_TRANSIT'));
    const p = service.cancelTransfer(1, staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái IN_TRANSIT, không thể hủy');
    noWrite();
  });

  it('UTCID08 CANCELLED twice', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(tr('CANCELLED'));
    await expect(service.cancelTransfer(1, staff)).rejects.toThrow(
      new BadRequestException('Phiếu đang ở trạng thái CANCELLED, không thể hủy'),
    );
    noWrite();
  });
});
