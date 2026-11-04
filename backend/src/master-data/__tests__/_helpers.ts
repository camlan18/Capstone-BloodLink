export async function errOf(p: Promise<any>): Promise<any> {
  return p.then(() => null, (e) => e);
}
export async function expectErr(p: Promise<any>, cls: any, msg?: string) {
  const e = await errOf(p);
  expect(e).toBeInstanceOf(cls);
  if (msg !== undefined) expect(e.message).toBe(msg);
}

// --- DTO validation (same pipe config as src/main.ts) ---
import { ValidationPipe, BadRequestException } from '@nestjs/common';
export const vpipe = new ValidationPipe({ whitelist: true, transform: true });
export const validate = (metatype: any, value: any, type: 'body' | 'query' = 'body') =>
  vpipe.transform(value, { type, metatype, data: '' });
export async function expectDtoErr(p: Promise<any>, msg?: string) {
  const e = await errOf(p);
  expect(e).toBeInstanceOf(BadRequestException);
  if (msg !== undefined) expect(e.getResponse().message).toContain(msg);
}
