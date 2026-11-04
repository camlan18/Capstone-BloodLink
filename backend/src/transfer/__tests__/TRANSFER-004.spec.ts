import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-004 TransferService.deliverTransfer', () => {
  let prisma: any, tx: any, service: TransferService;
  const staff = { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 };

  beforeEach(() => {
    tx = {
      blood_transfers: {
        findUnique: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'IN_TRANSIT', from_facility_id: 1, to_facility_id: 2 }),
        update: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'DELIVERED' }),
      },
      blood_inventory: { update: jest.fn() },
    };
    prisma = { $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))) };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 deliver IN_TRANSIT', async () => {
    const res = await service.deliverTransfer(1, staff);
    expect(res).toEqual({ data: { transfer_id: 1, status: 'DELIVERED' }, message: 'Đã xác nhận giao hàng. Chờ cơ sở nhận xác nhận.' });
    expect(tx.blood_transfers.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DELIVERED', updated_at: expect.any(Date) } }),
    );
  });

  it('UTCID02 ADMIN delivers', async () => {
    const res = await service.deliverTransfer(1, { user_id: 1, role_code: 'ADMIN' });
    expect(res.data.status).toBe('DELIVERED');
    expect(tx.blood_inventory.update).not.toHaveBeenCalled();
  });

  it('UTCID03 not found', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue(null);
    const p = service.deliverTransfer(999, staff);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID04 APPROVED rejected', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue({ transfer_id: 1, status: 'APPROVED' });
    const p = service.deliverTransfer(1, staff);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái APPROVED, chưa được vận chuyển');
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID05 double delivery', async () => {
    tx.blood_transfers.findUnique.mockResolvedValue({ transfer_id: 1, status: 'DELIVERED' });
    await expect(service.deliverTransfer(1, staff)).rejects.toThrow(
      new BadRequestException('Phiếu đang ở trạng thái DELIVERED, chưa được vận chuyển'),
    );
    expect(tx.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID06 unrelated facility staff can deliver', async () => {
    const res = await service.deliverTransfer(1, { user_id: 8, role_code: 'HOSPITAL_STAFF', facility_id: 3 });
    expect(res.data.status).toBe('DELIVERED');
    expect(tx.blood_transfers.update).toHaveBeenCalled();
  });
});
