import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-003 TransferService.shipTransfer', () => {
  let prisma: any, tx: any, service: TransferService;
  const staff = { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const transfer = (o: any = {}) => ({ transfer_id: 1, transfer_code: 'TRF-1', status: 'APPROVED', inventory_ids: null, inventory_id: null, ...o });
  const noWrite = () => {
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.inventory_transactions.create).not.toHaveBeenCalled();
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    tx = {
      blood_transfers: {
        findUnique: jest.fn().mockResolvedValue(transfer({ inventory_ids: JSON.stringify([{ id: 10 }, { id: 11 }]) })),
        update: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'IN_TRANSIT' }),
      },
      blood_inventory: { update: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 ship object ids', async () => {
    const res = await service.shipTransfer(1, staff);
    expect(res).toEqual({ data: { transfer_id: 1, status: 'IN_TRANSIT' }, message: 'Đã xuất kho. Túi máu đang được vận chuyển.' });
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(2);
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status_code: 'ALLOCATED' } }));
    expect(tx.inventory_transactions.create).toHaveBeenCalledTimes(2);
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'OUT', reference_type: 'TRANSFER' }),
    });
    expect(tx.blood_transfers.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_TRANSIT', shipped_at: expect.any(Date) }) }),
    );
  });

  it('UTCID02 legacy numeric ids', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_ids: '[10,11]' }));
    const res = await service.shipTransfer(1, staff);
    expect(res.data.status).toBe('IN_TRANSIT');
    expect(tx.inventory_transactions.create).toHaveBeenCalledTimes(2);
  });

  it('UTCID03 fallback to inventory_id', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_id: 10 }));
    const res = await service.shipTransfer(1, staff);
    expect(res.data.status).toBe('IN_TRANSIT');
    expect(tx.inventory_transactions.create).toHaveBeenCalledTimes(1);
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ inventory_id: 10 }) });
  });

  it('UTCID04 invalid JSON falls back', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_ids: 'not-json', inventory_id: 10 }));
    const res = await service.shipTransfer(1, staff);
    expect(res.data.status).toBe('IN_TRANSIT');
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { inventory_id: 10 } }));
    expect(tx.blood_inventory.update).toHaveBeenCalledTimes(1);
  });

  it('UTCID05 not found', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(null);
    const p = service.shipTransfer(999, staff);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    noWrite();
  });

  it('UTCID06 not APPROVED', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ status: 'PENDING' }));
    const p = service.shipTransfer(1, staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái PENDING, cần duyệt trước khi xuất kho');
    noWrite();
  });

  it('UTCID07 no bags', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_ids: '[]', inventory_id: null }));
    await expect(service.shipTransfer(1, staff)).rejects.toThrow(new BadRequestException('Chưa chọn túi máu cụ thể cho phiếu chuyển này'));
    noWrite();
  });

  it('UTCID08 other facility staff can ship', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(transfer({ inventory_ids: '[10]' }));
    const res = await service.shipTransfer(1, { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    expect(res.data.status).toBe('IN_TRANSIT');
    expect(tx.blood_transfers.update).toHaveBeenCalled();
  });
});
