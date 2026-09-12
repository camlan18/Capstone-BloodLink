const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const profiles = await prisma.donor_profiles.findMany({
    where: {
      first_donation_date: null,
      total_donations: { gt: 0 }
    }
  });

  console.log(`Found ${profiles.length} profiles to fix`);

  for (const p of profiles) {
    const firstDonation = await prisma.donations.findFirst({
      where: { donor_user_id: p.user_id, status_code: 'COMPLETED' },
      orderBy: { donation_date: 'asc' }
    });

    if (firstDonation) {
      await prisma.donor_profiles.update({
        where: { donor_profile_id: p.donor_profile_id },
        data: { first_donation_date: firstDonation.donation_date }
      });
      console.log(`Updated user ${p.user_id} first_donation_date to ${firstDonation.donation_date}`);
    } else if (p.last_donation_date) {
        // Fallback to last_donation_date if no donations found but total > 0
        await prisma.donor_profiles.update({
            where: { donor_profile_id: p.donor_profile_id },
            data: { first_donation_date: p.last_donation_date }
        });
        console.log(`Updated user ${p.user_id} first_donation_date to last_donation_date ${p.last_donation_date}`);
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

fix().catch(console.error);
