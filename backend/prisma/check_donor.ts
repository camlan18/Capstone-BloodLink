import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Truy vấn nhanh thông tin người hiến máu mẫu (`duongthuhuong@gmail.com`) kèm hồ sơ và lịch sử hiến để kiểm tra dữ liệu DB. */
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
