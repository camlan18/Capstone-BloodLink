import { makeSched } from './helpers';

describe('SCHED-008 SchedulesService.handleCronClosePastSchedules', () => {
  let s: ReturnType<typeof makeSched>;
  const um = () => s.prisma.facility_donation_schedules.updateMany;
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-11-03T00:05:00')); s = makeSched(); um().mockResolvedValue({ count: 0 }); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

  it('UTCID01 closes 3 past schedules', async () => {
    um().mockResolvedValue({ count: 3 });
    await expect(s.service.handleCronClosePastSchedules()).resolves.toBeUndefined();
    expect(um()).toHaveBeenCalledWith({ where: { status: 'OPEN', date: { lt: today() } }, data: { status: 'CLOSED' } });
  });

  it('UTCID02 none to close', async () => {
    await expect(s.service.handleCronClosePastSchedules()).resolves.toBeUndefined();
    expect(um()).toHaveBeenCalledTimes(1);
  });

  it('UTCID03 today is not closed (lt today 00:00)', async () => {
    await s.service.handleCronClosePastSchedules();
    const lt: Date = um().mock.calls[0][0].where.date.lt;
    expect(lt.getTime()).toBe(today().getTime());
    expect(new Date('2026-11-03T00:00:00').getTime()).toBeGreaterThanOrEqual(lt.getTime());
  });

  it('UTCID04 error swallowed', async () => {
    um().mockRejectedValue(new Error('db'));
    await expect(s.service.handleCronClosePastSchedules()).resolves.toBeUndefined();
  });

  it('UTCID05 onModuleInit runs the job once', async () => {
    const spy = jest.spyOn(s.service, 'handleCronClosePastSchedules');
    await expect(s.service.onModuleInit()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
