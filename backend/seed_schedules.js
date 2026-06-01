const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const facility = await prisma.medical_facilities.findFirst();
  if (!facility) return console.log('No facility found');
  
  const today = new Date();
  
  await prisma.facility_donation_schedules.createMany({
    data: [
      {
        facility_id: facility.facility_id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
        start_time: new Date('1970-01-01T08:00:00Z'),
        end_time: new Date('1970-01-01T11:00:00Z'),
        max_donors: 50,
        current_donors: 10,
        status: 'OPEN'
      },
      {
        facility_id: facility.facility_id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
        start_time: new Date('1970-01-01T13:30:00Z'),
        end_time: new Date('1970-01-01T16:30:00Z'),
        max_donors: 30,
        current_donors: 5,
        status: 'OPEN'
      }
    ]
  });
  console.log('Seeded schedules successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
