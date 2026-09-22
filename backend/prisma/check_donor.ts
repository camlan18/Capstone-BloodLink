import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.users.findUnique({
    where: { email: 'duongthuhuong@gmail.com' },
    include: {
      donor_profile: true,
      donations_donor: true
    }
  });

  console.log('USER:', user?.user_id, user?.full_name);
  console.log('DONOR_PROFILE:', JSON.stringify(user?.donor_profile, null, 2));
  console.log('DONATIONS_DONOR:', JSON.stringify(user?.donations_donor, null, 2));
}

main().finally(() => prisma.$disconnect());
