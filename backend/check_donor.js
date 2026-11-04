"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.users.findFirst({
        where: { email: 'duongthuhuong@gmail.com' }
    });
    if (!user) {
        console.log('User not found');
        return;
    }
    const profile = await prisma.donor_profiles.findUnique({
        where: { user_id: user.user_id }
    });
    const donations = await prisma.donations.findMany({
        where: { donor_user_id: user.user_id }
    });
    console.log('User ID:', user.user_id);
    console.log('Donor Profile:', JSON.stringify(profile, null, 2));
    console.log('Donations:', JSON.stringify(donations, null, 2));
}
main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=check_donor.js.map