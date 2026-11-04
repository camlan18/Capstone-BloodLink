import { makeDonor } from './helpers';

describe('DONOR-012 DonorService.handleCronDonationReminders', () => {
  let s: ReturnType<typeof makeDonor>;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T08:00:00Z'));
    s = makeDonor();
    s.prisma.donation_reminders.findMany.mockResolvedValue([]);
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  const rem = (o: any) => ({ reminder_id: 1, user_id: 5, donation_id: 10, reminder_type: 'UPCOMING_ELIGIBLE', message: 'm', ...o });

  it('UTCID01 sends two reminders', async () => {
    s.prisma.donation_reminders.findMany.mockResolvedValue([rem({}), rem({ reminder_id: 2, donation_id: 11, reminder_type: 'NOW_ELIGIBLE' })]);
    await expect(s.service.handleCronDonationReminders()).resolves.toBeUndefined();
    const titles = s.notifications.createNotification.mock.calls.map((c: any) => c[0].title);
    expect(titles).toEqual(['Sắp tới hạn hiến máu', 'Đã đến hạn hiến máu']);
    expect(s.prisma.donation_reminders.update).toHaveBeenCalledTimes(2);
    expect(s.prisma.donation_reminders.update).toHaveBeenCalledWith({ where: { reminder_id: 1 }, data: { is_sent: true, sent_at: expect.any(Date) } });
  });

  it('UTCID02 no reminders', async () => {
    await expect(s.service.handleCronDonationReminders()).resolves.toBeUndefined();
    expect(s.notifications.createNotification).not.toHaveBeenCalled();
    expect(s.prisma.donation_reminders.update).not.toHaveBeenCalled();
  });

  it('UTCID03 where uses today midnight', async () => {
    await s.service.handleCronDonationReminders();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    expect(s.prisma.donation_reminders.findMany).toHaveBeenCalledWith({ where: { is_sent: false, reminder_date: { lte: today } } });
  });

  it('UTCID04 reminder without donation_id', async () => {
    s.prisma.donation_reminders.findMany.mockResolvedValue([rem({ donation_id: null })]);
    await s.service.handleCronDonationReminders();
    expect(s.notifications.createNotification).toHaveBeenCalledWith(expect.objectContaining({ reference_id: undefined, reference_type: 'DONATION' }));
  });

  it('UTCID05 findMany rejects', async () => {
    s.prisma.donation_reminders.findMany.mockRejectedValue(new Error('db'));
    await expect(s.service.handleCronDonationReminders()).resolves.toBeUndefined();
    expect(s.notifications.createNotification).not.toHaveBeenCalled();
  });

  it('UTCID06 notification failure aborts batch', async () => {
    s.prisma.donation_reminders.findMany.mockResolvedValue([rem({}), rem({ reminder_id: 2 })]);
    s.notifications.createNotification.mockRejectedValueOnce(new Error('x'));
    await expect(s.service.handleCronDonationReminders()).resolves.toBeUndefined();
    expect(s.notifications.createNotification).toHaveBeenCalledTimes(1);
    expect(s.prisma.donation_reminders.update).not.toHaveBeenCalled();
  });
});
