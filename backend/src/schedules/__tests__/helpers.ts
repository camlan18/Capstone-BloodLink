import { Logger } from '@nestjs/common';
import { SchedulesService } from '../schedules.service';
import { makePrisma } from '../../donor/__tests__/helpers';

export function makeSched() {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const prisma = makePrisma();
  const notifications: any = { createNotification: jest.fn().mockResolvedValue(undefined) };
  const service = new SchedulesService(prisma, notifications);
  return { service, prisma, notifications };
}
