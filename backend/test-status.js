const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.blood_request_statuses.findMany();
  console.log(JSON.stringify(statuses, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
