import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import { ReceiveBloodDto } from '../dto/receive-blood.dto';

describe('INV-001 InventoryService.receiveBlood', () => {
  let prisma: any, tx: any, service: InventoryService;
  const admin = { user_id: 1, role_code: 'ADMIN' };
  const dto = () => ({ bag_code: 'BAG-001', facility_id: 1, blood_type_id: 1, component_id: 1 });

  beforeEach(() => {
    tx = {
      blood_inventory: { create: jest.fn().mockResolvedValue({ inventory_id: 10, status_code: 'AVAILABLE' }) },
      inventory_transactions: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      blood_inventory: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
    };
    service = new InventoryService(prisma as any, {} as any);
  });

  it('UTCID01 ADMIN receives new bag', async () => {
    const res = await service.receiveBlood(dto(), admin);
    expect(res).toEqual({ inventory_id: 10, status_code: 'AVAILABLE' });
    expect(tx.blood_inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ facility_id: 1, status_code: 'AVAILABLE' }),
    });
    expect(tx.inventory_transactions.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ transaction_type: 'IN', reference_type: 'DONATION' }),
    });
  });

  it('UTCID02 HOSPITAL_STAFF uses own facility', async () => {
    await service.receiveBlood({ ...dto(), facility_id: 3 }, { user_id: 5, role_code: 'HOSPITAL_STAFF', facility_id: 1 });
    expect(tx.blood_inventory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ facility_id: 1 }) });
  });

  it('UTCID03 missing facility_id', async () => {
    await expect(service.receiveBlood({ bag_code: 'BAG-001' }, admin)).rejects.toThrow(
      new BadRequestException('Cơ sở y tế không được để trống'),
    );
    expect(prisma.blood_inventory.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID04 staff without facility', async () => {
    await expect(
      service.receiveBlood(dto(), { user_id: 7, role_code: 'HOSPITAL_STAFF', facility_id: null }),
    ).rejects.toThrow(new BadRequestException('Cơ sở y tế không được để trống'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('UTCID05 duplicate bag_code', async () => {
    prisma.blood_inventory.findUnique.mockResolvedValue({ inventory_id: 99 });
    const p = service.receiveBlood(dto(), admin);
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    await expect(p).rejects.toThrow('Mã túi máu (bag_code) đã tồn tại trong hệ thống.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.blood_inventory.create).not.toHaveBeenCalled();
  });

  it('UTCID06 transaction create rejects', async () => {
    const err = new Error('prisma fail');
    tx.inventory_transactions.create.mockRejectedValue(err);
    await expect(service.receiveBlood(dto(), admin)).rejects.toBe(err);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.blood_inventory.create).toHaveBeenCalled();
  });

  // ---- DTO validation: ValidationPipe({ whitelist: true, transform: true }) as in src/main.ts ----
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const run = (body: any) => pipe.transform(body, { type: 'body', metatype: ReceiveBloodDto, data: '' });
  const valid = (): any => ({ facility_id: 1, blood_type_id: 1, component_id: 1, bag_code: 'BAG-001', volume_ml: 350, collection_date: '2026-05-31T08:00:00Z', expiry_date: '2026-07-05T08:00:00Z' });
  const omit = (k: string) => { const b = valid(); delete b[k]; return b; };

  it('UTCID07 DTO facility_id missing', async () => {
    const body: any = omit('facility_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be an integer number");
  });

  it('UTCID08 DTO facility_id not integer (1.5)', async () => {
    const body: any = { ...valid(), facility_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be an integer number");
  });

  it('UTCID09 DTO facility_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), facility_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("facility_id must be a positive number");
  });

  it('UTCID10 DTO facility_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), facility_id: 1 })).resolves.toEqual(expect.objectContaining({ facility_id: 1 }));
  });

  it('UTCID11 DTO blood_type_id missing', async () => {
    const body: any = omit('blood_type_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be an integer number");
  });

  it('UTCID12 DTO blood_type_id not integer (1.5)', async () => {
    const body: any = { ...valid(), blood_type_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be an integer number");
  });

  it('UTCID13 DTO blood_type_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), blood_type_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("blood_type_id must be a positive number");
  });

  it('UTCID14 DTO blood_type_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), blood_type_id: 1 })).resolves.toEqual(expect.objectContaining({ blood_type_id: 1 }));
  });

  it('UTCID15 DTO component_id missing', async () => {
    const body: any = omit('component_id');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be an integer number");
  });

  it('UTCID16 DTO component_id not integer (1.5)', async () => {
    const body: any = { ...valid(), component_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be an integer number");
  });

  it('UTCID17 DTO component_id = 0 (not positive)', async () => {
    const body: any = { ...valid(), component_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("component_id must be a positive number");
  });

  it('UTCID18 DTO component_id = 1 (positive boundary)', async () => {
    await expect(run({ ...valid(), component_id: 1 })).resolves.toEqual(expect.objectContaining({ component_id: 1 }));
  });

  it('UTCID19 DTO bag_code empty', async () => {
    const body: any = { ...valid(), bag_code: '' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("bag_code should not be empty");
  });

  it('UTCID20 DTO bag_code not a string', async () => {
    const body: any = { ...valid(), bag_code: 123 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("bag_code must be a string");
  });

  it('UTCID21 DTO bag_code length 50 (max)', async () => {
    await expect(run({ ...valid(), bag_code: 'a'.repeat(50) })).resolves.toEqual(expect.objectContaining({ bag_code: 'a'.repeat(50) }));
  });

  it('UTCID22 DTO bag_code length 51', async () => {
    const body: any = { ...valid(), bag_code: 'a'.repeat(51) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("bag_code must be shorter than or equal to 50 characters");
  });

  it('UTCID23 DTO volume_ml missing', async () => {
    const body: any = omit('volume_ml');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("volume_ml must be an integer number");
  });

  it('UTCID24 DTO volume_ml not integer (350.5)', async () => {
    const body: any = { ...valid(), volume_ml: 350.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("volume_ml must be an integer number");
  });

  it('UTCID25 DTO volume_ml = 49 (below min)', async () => {
    const body: any = { ...valid(), volume_ml: 49 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("volume_ml must not be less than 50");
  });

  it('UTCID26 DTO volume_ml = 50 (min boundary)', async () => {
    await expect(run({ ...valid(), volume_ml: 50 })).resolves.toEqual(expect.objectContaining({ volume_ml: 50 }));
  });

  it('UTCID27 DTO collection_date missing', async () => {
    const body: any = omit('collection_date');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("collection_date must be a valid ISO 8601 date string");
  });

  it('UTCID28 DTO collection_date not ISO', async () => {
    const body: any = { ...valid(), collection_date: '31/05/2026' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("collection_date must be a valid ISO 8601 date string");
  });

  it('UTCID29 DTO expiry_date missing', async () => {
    const body: any = omit('expiry_date');
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("expiry_date must be a valid ISO 8601 date string");
  });

  it('UTCID30 DTO expiry_date not ISO', async () => {
    const body: any = { ...valid(), expiry_date: 'next month' };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("expiry_date must be a valid ISO 8601 date string");
  });

  it('UTCID31 DTO source_donation_id not integer', async () => {
    const body: any = { ...valid(), source_donation_id: 1.5 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("source_donation_id must be an integer number");
  });

  it('UTCID32 DTO source_donation_id = 0', async () => {
    const body: any = { ...valid(), source_donation_id: 0 };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("source_donation_id must be a positive number");
  });

  it('UTCID33 DTO source_donation_id = 1', async () => {
    await expect(run({ ...valid(), source_donation_id: 1 })).resolves.toEqual(expect.objectContaining({ source_donation_id: 1 }));
  });

  it('UTCID34 DTO notes length 500 (max)', async () => {
    await expect(run({ ...valid(), notes: 'a'.repeat(500) })).resolves.toEqual(expect.objectContaining({ notes: 'a'.repeat(500) }));
  });

  it('UTCID35 DTO notes length 501', async () => {
    const body: any = { ...valid(), notes: 'a'.repeat(501) };
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
    const err = await run(body).catch((e: any) => e);
    expect(err.getResponse().message).toContain("notes must be shorter than or equal to 500 characters");
  });

  it('UTCID36 DTO unknown property status_code stripped', async () => {
    const out: any = await run({ ...valid(), status_code: 'DISCARDED' });
    expect(out).not.toHaveProperty('status_code');
    expect(out).toEqual(expect.objectContaining(valid()));
  });
});
