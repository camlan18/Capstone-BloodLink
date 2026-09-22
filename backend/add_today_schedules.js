"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const fac1 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BCTM_CANTHO' } });
    const fac2 = await prisma.medical_facilities.findFirst({ where: { facility_code: 'BCTM_HCM' } });
    if (fac1) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await prisma.facility_donation_schedules.findFirst({
            where: { facility_id: fac1.facility_id, date: today }
        });
        if (!existing) {
            await prisma.facility_donation_schedules.create({
                data: {
                    facility_id: fac1.facility_id,
                    date: today,
                    start_time: new Date('1970-01-01T07:30:00Z'),
                    end_time: new Date('1970-01-01T11:30:00Z'),
                    max_donors: 80,
                    current_donors: 10,
                    status: 'OPEN',
                    terms_html: '<p>Tiếp nhận hiến máu tình nguyện trong ngày tại BV Huyết học Cần Thơ.</p>'
                }
            });
            console.log('Added schedule for BCTM_CANTHO today');
        }
    }
    if (fac2) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await prisma.facility_donation_schedules.findFirst({
            where: { facility_id: fac2.facility_id, date: today }
        });
        if (!existing) {
            await prisma.facility_donation_schedules.create({
                data: {
                    facility_id: fac2.facility_id,
                    date: today,
                    start_time: new Date('1970-01-01T07:30:00Z'),
                    end_time: new Date('1970-01-01T11:30:00Z'),
                    max_donors: 100,
                    current_donors: 15,
                    status: 'OPEN',
                    terms_html: '<p>Tiếp nhận hiến máu tình nguyện trong ngày tại Trung tâm Truyền máu TP.HCM.</p>'
                }
            });
            console.log('Added schedule for BCTM_HCM today');
        }
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=add_today_schedules.js.map