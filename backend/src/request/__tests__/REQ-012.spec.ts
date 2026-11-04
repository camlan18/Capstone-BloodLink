import { BadRequestException } from '@nestjs/common';
import { RequestService } from '../request.service';

describe('REQ-012 RequestService.getRequestById', () => {
  let prisma: any, service: RequestService;
  const found = (o: any = {}) => ({ request_id: 1, requester_user_id: 9, ...o });

  beforeEach(() => {
    prisma = { blood_requests: { findUnique: jest.fn().mockResolvedValue(found()) } };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 owner views request', async () => {
    const res = await service.getRequestById(1, 9);
    expect(res).toEqual(found());
    const arg = prisma.blood_requests.findUnique.mock.calls[0][0];
    expect(arg.include.status_history.orderBy).toEqual({ created_at: 'desc' });
  });

  it('UTCID02 not found', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(null);
    const p = service.getRequestById(999, 9);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Yêu cầu không tồn tại');
  });

  it('UTCID03 other user', async () => {
    const p = service.getRequestById(1, 10);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền xem yêu cầu này');
  });

  it('UTCID04 public request without requester', async () => {
    prisma.blood_requests.findUnique.mockResolvedValue(found({ requester_user_id: null }));
    await expect(service.getRequestById(1, 9)).rejects.toThrow(new BadRequestException('Bạn không có quyền xem yêu cầu này'));
  });

  it('UTCID05 string userId fails strict compare', async () => {
    await expect(service.getRequestById(1, '9' as any)).rejects.toThrow(new BadRequestException('Bạn không có quyền xem yêu cầu này'));
  });
});
