import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-006 TransferService.rejectTransfer', () => {
  let prisma: any, service: TransferService;
  const staff = { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 };
  const tr = (status: string) => ({ transfer_id: 1, status, from_facility_id: 1, inventory_ids: JSON.stringify([{ id: 10 }]) });

  beforeEach(() => {
    prisma = {
      blood_transfers: {
        findUnique: jest.fn().mockResolvedValue(tr('PENDING')),
        update: jest.fn().mockResolvedValue({ transfer_id: 1, status: 'REJECTED' }),
      },
      blood_inventory: { update: jest.fn().mockResolvedValue({}) },
    };
    service = new TransferService(prisma as any, {} as any);
  });

  it('UTCID01 reject PENDING', async () => {
    const res = await service.rejectTransfer(1, staff, 'Hết máu');
    expect(res).toEqual({ data: { transfer_id: 1, status: 'REJECTED' }, message: 'Đã từ chối phiếu chuyển máu.' });
    expect(prisma.blood_transfers.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', reject_reason: 'Hết máu' }) }),
    );
  });

  it('UTCID02 empty reason', async () => {
    const res = await service.rejectTransfer(1, staff, '');
    expect(res.data.status).toBe('REJECTED');
    expect(prisma.blood_transfers.update.mock.calls[0][0].data.reject_reason).toBe('Không có lý do');
  });

  it('UTCID03 reject APPROVED must release bags', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(tr('APPROVED'));
    const res = await service.rejectTransfer(1, staff, 'Hết máu');
    expect(res.data.status).toBe('REJECTED');
    expect(prisma.blood_inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inventory_id: 10 }, data: { status_code: 'AVAILABLE' } }),
    );
  });

  it('UTCID04 not found', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(null);
    const p = service.rejectTransfer(999, staff, 'Hết máu');
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy phiếu chuyển máu');
    expect(prisma.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID05 IN_TRANSIT rejected', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(tr('IN_TRANSIT'));
    const p = service.rejectTransfer(1, staff, 'Hết máu');
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Phiếu đang ở trạng thái IN_TRANSIT, không thể từ chối');
    expect(prisma.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID06 REJECTED twice', async () => {
    prisma.blood_transfers.findUnique.mockResolvedValue(tr('REJECTED'));
    await expect(service.rejectTransfer(1, staff, 'Hết máu')).rejects.toThrow(
      new BadRequestException('Phiếu đang ở trạng thái REJECTED, không thể từ chối'),
    );
    expect(prisma.blood_transfers.update).not.toHaveBeenCalled();
  });

  it('UTCID07 other facility staff can reject', async () => {
    const res = await service.rejectTransfer(1, { user_id: 8, role_code: 'HOSPITAL_STAFF', facility_id: 3 }, 'x');
    expect(res.data.status).toBe('REJECTED');
    expect(prisma.blood_transfers.update).toHaveBeenCalled();
  });
});
