const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const items = await prisma.item.findMany();
    console.log('QUERY OK! Total de itens encontrados:', items.length);
  } catch (err) {
    console.error('ERRO:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
