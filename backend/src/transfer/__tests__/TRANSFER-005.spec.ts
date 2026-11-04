import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-005 TransferService.receiveTransfer / receiveBatchTransfers', () => {
  let prisma: any, tx: any, service: TransferService, transfers: Record<number, any>;
  const staff = { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 };
  const tr = (id: number, o: any = {}) => ({
    transfer_id: id, transfer_code: `TRF-${id}`, status: 'DELIVERED', from_facility_id: 1, to_facility_id: 2,
    inventory_ids: JSON.stringify([{ id: 10 }]), inventory_id: null, ...o,
  });
  const noWrite = () => {
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
    expect(tx.inventory_transactions.create).not.toHaveBeenCalled();
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    transfers = { 1: tr(1), 2: tr(2) };
    tx = {
      blood_transfers: {
        findUnique: jest.fn(async ({ where }: any) => transfers[where.transfer_id] ?? null),
        update: jest.fn(async ({ where }: any) => ({ transfer_id: where.transfer_id, status: 'RECEIVED' })),
      },
      blood_inventory: { update: jest.fn().mockResolvedValue({}) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 receive DELIVERED', async () => {
    const res = await service.receiveTransfer(1, staff);
    expect(res).toEqual({ data: { transfer_id: 1, status: 'RECEIVED' }, message: 'Đã xác nhận nhận kho thành công!' });
    expect(tx.blood_inventory.update).toHaveBeenCalledWith({
      where: { inventory_id: 10 },
      data: { facility_id: 2, status_code: 'AVAILABLE' },
    });
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'IN', reference_type: 'TRANSFER' }),
    });
    expect(tx.blood_transfers.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RECEIVED', received_at: expect.any(Date) }) }),
    );
  });

  it('UTCID02 receive IN_TRANSIT', async () => {
    transfers[1] = tr(1, { status: 'IN_TRANSIT' });
    const res = await service.receiveTransfer(1, staff);
    expect(res.data.status).toBe('RECEIVED');
    expect(tx.blood_inventory.update).toHaveBeenCalled();
  });

  it('UTCID03 fallback to inventory_id', async () => {
    transfers[1] = tr(1, { inventory_ids: null, inventory_id: 10 });
    const res = await service.receiveTransfer(1, staff);
    expect(res.data.status).toBe('RECEIVED');
    expect(tx.blood_inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { inventory_id: 10 } }));
  });

  it('UTCID04 not found', async () => {
    const p = service.receiveTransfer(999, staff);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    noWrite();
  });

  it('UTCID05 APPROVED rejected', async () => {
    transfers[1] = tr(1, { status: 'APPROVED' });
    const p = service.receiveTransfer(1, staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái APPROVED, chưa được giao đến');
    noWrite();
  });

  it('UTCID06 double receive', async () => {
    transfers[1] = tr(1, { status: 'RECEIVED' });
    await expect(service.receiveTransfer(1, staff)).rejects.toThrow(
      new BadRequestException('Phiếu đang ở trạng thái RECEIVED, chưa được giao đến'),
    );
    noWrite();
  });

  it('UTCID07 no bags', async () => {
    transfers[1] = tr(1, { inventory_ids: '[]', inventory_id: null });
    await expect(service.receiveTransfer(1, staff)).rejects.toThrow(new BadRequestException('Phiếu chuyển không có túi máu'));
    noWrite();
  });

  it('UTCID08 batch of two', async () => {
    const spy = jest.spyOn(service, 'receiveTransfer');
    const res = await service.receiveBatchTransfers([1, 2], staff);
    expect(res.data).toHaveLength(2);
    expect(res.message).toBe('Đã xác nhận nhận kho thành công 2 phiếu chuyển máu!');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('UTCID09 empty batch', async () => {
    const spy = jest.spyOn(service, 'receiveTransfer');
    const p = service.receiveBatchTransfers([], staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Vui lòng chọn ít nhất một phiếu chuyển máu để xác nhận');
    expect(spy).not.toHaveBeenCalled();
  });

  it('UTCID10 null batch', async () => {
    await expect(service.receiveBatchTransfers(null as any, staff)).rejects.toThrow(
      new BadRequestException('Vui lòng chọn ít nhất một phiếu chuyển máu để xác nhận'),
    );
  });

  it('UTCID11 batch not atomic', async () => {
    transfers[2] = tr(2, { status: 'PENDING' });
    const p = service.receiveBatchTransfers([1, 2], staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái PENDING, chưa được giao đến');
    expect(tx.blood_transfers.update).toHaveBeenCalledWith(expect.objectContaining({ where: { transfer_id: 1 } }));
  });

  it('UTCID12 receiver from another facility', async () => {
    const res = await service.receiveTransfer(1, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.data.status).toBe('RECEIVED');
    expect(tx.blood_inventory.update).toHaveBeenCalled();
  });
});
