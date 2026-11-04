export async function errOf(p: Promise<any>): Promise<any> {
  return p.then(() => null, (e) => e);
}
export async function expectErr(p: Promise<any>, cls: any, msg?: string) {
  const e = await errOf(p);
  expect(e).toBeInstanceOf(cls);
  if (msg !== undefined) expect(e.message).toBe(msg);
}
