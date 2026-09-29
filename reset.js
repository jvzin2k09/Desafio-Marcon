const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.item.updateMany({
    where: { quantidade: { lt: 0 } },
    data: { quantidade: 1000 }
  });
  console.log('Done');
}
run();
