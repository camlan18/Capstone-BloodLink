import { Logger } from '@nestjs/common';
import { DonorService } from '../donor.service';

export function makePrisma(): any {
  const delegates: any = {};
  const tx = jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  const prisma: any = new Proxy({}, {
    get(_t, k: string) {
      if (k === 'then') return undefined;
      if (k === '$transaction') return tx;
      if (!delegates[k]) {
        const fns: any = {};
        delegates[k] = new Proxy(fns, {
          get(t, m: string) {
            if (m === 'then') return undefined;
            if (!t[m]) t[m] = jest.fn();
            return t[m];
          },
        });
      }
      return delegates[k];
    },
  });
  return prisma;
}

export function makeDonor() {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const prisma = makePrisma();
  const notifications: any = {
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
  };
  const settings: any = { getSettingValue: jest.fn().mockResolvedValue('3') };
  const service = new DonorService(prisma, notifications, settings);
  return { service, prisma, notifications, settings };
}

export const D = (s: string) => new Date(s);
export function addDays(d: Date | string, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
