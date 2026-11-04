import { BadRequestException } from '@nestjs/common';
import { TransferService } from '../transfer.service';

describe('TRANSFER-001 TransferService.createTransfer', () => {
  let prisma: any, notif: any, service: TransferService;
  const user = { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 };
  const dto = (o: any = {}): any => ({ from_facility_id: 1, to_facility_id: 2, blood_type_id: 1, component_id: 1, ...o });
  const created = { transfer_id: 1, transfer_code: 'TRF-X', status: 'PENDING', blood_type: { blood_type_code: 'O+' } };
  const noWrite = () => expect(prisma.blood_transfers.create).not.toHaveBeenCalled();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T10:00:00'));
    prisma = {
      medical_facilities: {
        findUnique: jest.fn(async ({ where }: any) => ({ facility_id: where.facility_id, facility_name: `F${where.facility_id}` })),
      },
      blood_inventory: { findUnique: jest.fn().mockResolvedValue({ inventory_id: 10, facility_id: 1, status_code: 'AVAILABLE' }) },
      blood_transfers: { create: jest.fn().mockResolvedValue(created) },
      users: { findMany: jest.fn().mockResolvedValue([{ user_id: 11 }, { user_id: 12 }]) },
    };
    notif = { createNotification: jest.fn().mockResolvedValue({}) };
    service = new TransferService(prisma as any, notif as any);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('UTCID01 create PENDING transfer', async () => {
    const res = await service.createTransfer(dto(), user);
    expect(res.data).toEqual(created);
    expect(res.message).toContain('Đã tạo phiếu yêu cầu chuyển máu thành công');
    expect(prisma.blood_transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', inventory_id: null, requested_by: 6 }) }),
    );
    expect(notif.createNotification).toHaveBeenCalledTimes(2);
    expect(notif.createNotification).toHaveBeenCalledWith(expect.objectContaining({ reference_type: 'TRANSFER' }));
  });

  it('UTCID02 with bag, units and required_before', async () => {
    const res = await service.createTransfer(dto({ inventory_id: 10, units_requested: 2, required_before: '2026-11-03T13:00' }), user);
    expect(res.data).toBeDefined();
    const data = prisma.blood_transfers.create.mock.calls[0][0].data;
    expect(data.inventory_id).toBe(10);
    expect(data.units_requested).toBe(2);
    expect(data.required_before).toBeInstanceOf(Date);
  });

  it('UTCID03 required_before exactly now+2h', async () => {
    const res = await service.createTransfer(dto({ required_before: '2026-11-03T12:00' }), user);
    expect(res.data).toBeDefined();
    expect(prisma.blood_transfers.create).toHaveBeenCalled();
  });

  it('UTCID04 required_before under 2h', async () => {
    const p = service.createTransfer(dto({ required_before: '2026-11-03T11:59' }), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Thời gian cần trước phải cách thời điểm hiện tại ít nhất 2 giờ');
    noWrite();
  });

  it('UTCID05 same facility', async () => {
    const p = service.createTransfer(dto({ to_facility_id: 1 }), { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Cơ sở xuất và cơ sở nhận không được trùng nhau');
    expect(prisma.medical_facilities.findUnique).not.toHaveBeenCalled();
  });

  it('UTCID06 source facility missing', async () => {
    prisma.medical_facilities.findUnique.mockImplementation(async ({ where }: any) => (where.facility_id === 1 ? null : { facility_id: 2 }));
    const p = service.createTransfer(dto(), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Cơ sở xuất không tồn tại');
    noWrite();
  });

  it('UTCID07 target facility missing', async () => {
    prisma.medical_facilities.findUnique.mockImplementation(async ({ where }: any) => (where.facility_id === 2 ? null : { facility_id: 1 }));
    const p = service.createTransfer(dto(), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Cơ sở nhận không tồn tại');
    noWrite();
  });

  it('UTCID08 bag not found', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue(null);
    const p = service.createTransfer(dto({ inventory_id: 99 }), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu không tồn tại');
    noWrite();
  });

  it('UTCID09 bag in other facility', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ inventory_id: 10, facility_id: 3, status_code: 'AVAILABLE' });
    const p = service.createTransfer(dto({ inventory_id: 10 }), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu không thuộc cơ sở xuất');
    noWrite();
  });

  it('UTCID10 bag RESERVED', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ inventory_id: 10, facility_id: 1, status_code: 'RESERVED' });
    const p = service.createTransfer(dto({ inventory_id: 10 }), user);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Túi máu đang ở trạng thái RESERVED, không thể chuyển');
    noWrite();
  });

  it('UTCID11 notification lookup fails', async () => {
    prisma.users.findMany.mockRejectedValue(new Error('db'));
    const res = await service.createTransfer(dto(), user);
    expect(res.data).toEqual(created);
    expect(prisma.blood_transfers.create).toHaveBeenCalled();
    expect(notif.createNotification).not.toHaveBeenCalled();
  });

  it('UTCID12 any staff can create', async () => {
    const res = await service.createTransfer(dto(), { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.data).toEqual(created);
    expect(prisma.blood_transfers.create).toHaveBeenCalled();
  });
});
