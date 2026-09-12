const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const comments = await prisma.blog_comments.findMany({
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(comments, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
