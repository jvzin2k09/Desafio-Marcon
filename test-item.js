const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.item.findMany();
    console.log('QUERY OK! Primeiro item:', items[0]);
  } catch (err) {
    console.error('ERRO:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
