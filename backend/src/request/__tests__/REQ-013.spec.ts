import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { RequestService } from '../request.service';
import { UpdateMatchStatusDto } from '../dto/matching-allocation.dto';

describe('REQ-013 RequestService.updateMatchStatus', () => {
  let prisma: any, service: RequestService;
  const admin = { user_id: 1, role_code: 'ADMIN' };

  beforeEach(() => {
    prisma = {
      blood_request_donor_matches: {
        findUnique: jest.fn().mockResolvedValue({ match_id: 7, request: { facility_id: 1 } }),
        update: jest.fn(async ({ data }: any) => ({ match_id: 7, ...data })),
      },
    };
    service = new RequestService(prisma as any, {} as any, {} as any, {} as any);
  });

  it('UTCID01 ADMIN sets CONTACTED', async () => {
    const res = await service.updateMatchStatus(7, 'CONTACTED', admin);
    expect(res).toEqual({ match_id: 7, match_status: 'CONTACTED' });
    expect(prisma.blood_request_donor_matches.update).toHaveBeenCalledWith({ where: { match_id: 7 }, data: { match_status: 'CONTACTED' } });
  });

  it('UTCID02 staff same facility', async () => {
    const res = await service.updateMatchStatus(7, 'ACCEPTED', { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(res.match_status).toBe('ACCEPTED');
    expect(prisma.blood_request_donor_matches.update).toHaveBeenCalled();
  });

  it('UTCID03 no user', async () => {
    const res = await service.updateMatchStatus(7, 'DECLINED', undefined);
    expect(res.match_status).toBe('DECLINED');
    expect(prisma.blood_request_donor_matches.update).toHaveBeenCalled();
  });

  it('UTCID04 match not found', async () => {
    prisma.blood_request_donor_matches.findUnique.mockResolvedValue(null);
    const p = service.updateMatchStatus(999, 'CONTACTED', admin);
    await expect(p).rejects.toBeInstanceOf(NotFoundException);
    await expect(p).rejects.toThrow('Không tìm thấy ghép nối');
    expect(prisma.blood_request_donor_matches.update).not.toHaveBeenCalled();
  });

  it('UTCID05 other facility staff', async () => {
    const p = service.updateMatchStatus(7, 'CONTACTED', { user_id: 6, role_code: 'HOSPITAL_STAFF', facility_id: 2 });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Bạn không có quyền thao tác');
    expect(prisma.blood_request_donor_matches.update).not.toHaveBeenCalled();
  });

  it('UTCID06 any transition allowed', async () => {
    prisma.blood_request_donor_matches.findUnique.mockResolvedValue({ match_id: 7, match_status: 'COMPLETED', request: { facility_id: 1 } });
    const res = await service.updateMatchStatus(7, 'PENDING', admin);
    expect(res.match_status).toBe('PENDING');
    expect(prisma.blood_request_donor_matches.update).toHaveBeenCalled();
  });

  // ---- DTO validation: ValidationPipe({ whitelist: true, transform: true }) as in src/main.ts ----
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) => pipe.transform(body, { type: 'body', metatype: UpdateMatchStatusDto, data: '' });
  const valid = (): any => ({ status: 'CONTACTED' });
  const omit = (k: string) => { const b = valid(); delete b[k]; return b; };

  it('UTCID07 DTO status empty', async () => {
    const body: any = { ...valid(), status: '' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("status should not be empty");
  });

  it('UTCID08 DTO status not a string', async () => {
    const body: any = { ...valid(), status: 1 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("status must be a string");
  });

  it('UTCID09 DTO status "COMPLETED" not in list', async () => {
    const body: any = { ...valid(), status: 'COMPLETED' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("status must be one of the following values: PENDING, CONTACTED, ACCEPTED, REJECTED");
  });
});
