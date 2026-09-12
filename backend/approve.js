const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.blog_comments.updateMany({
    where: { is_approved: false },
    data: { is_approved: true }
  });
  console.log('Updated:', result.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
