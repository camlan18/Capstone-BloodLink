import { NotFoundException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-003 RequestService.getRequestByCode', () => {
  let prisma: any, service: RequestService;

  beforeEach(() => {
    prisma = {
      blood_requests: { findFirst: jest.fn().mockResolvedValue({ request_id: 1, request_code: 'RQ-1' }) },
      donor_availability_slots: { count: jest.fn().mockResolvedValue(3) },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 found with donors', async () => {
    const res = await service.getRequestByCode('RQ-1');
    expect(res).toEqual({ request_id: 1, request_code: 'RQ-1', registered_donors_count: 3 });
    expect(prisma.donor_availability_slots.count).toHaveBeenCalledWith({
      where: { notes: { contains: 'RQ-1' }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
    });
  });

  it('UTCID02 found with zero donors', async () => {
    prisma.donor_availability_slots.count.mockResolvedValue(0);
    const res = await service.getRequestByCode('RQ-1');
    expect(res.registered_donors_count).toBe(0);
  });

  it('UTCID03 not found', async () => {
    prisma.blood_requests.findFirst.mockResolvedValue(null);
    const p = service.getRequestByCode('RQ-404');
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy yêu cầu máu với mã này');
    expect(prisma.donor_availability_slots.count).not.toHaveBeenCalled();
  });

  it('UTCID04 empty code', async () => {
    prisma.blood_requests.findFirst.mockResolvedValue(null);
    await expect(service.getRequestByCode('')).rejects.toThrow(new NotFoundException('Không tìm thấy yêu cầu máu với mã này'));
  });

  it('UTCID05 includes relations', async () => {
    await service.getRequestByCode('RQ-1');
    const include = prisma.blood_requests.findFirst.mock.calls[0][0].include;
    expect(Object.keys(include).sort()).toEqual(['blood_type', 'component', 'facility', 'status', 'urgency']);
  });
});
