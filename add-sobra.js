const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.item.findFirst({ where: { codigo: 'TM-001' } });
  if (!item) return console.log('Item not found');
  
  await prisma.estoque_alternativo.upsert({
    where: {
      itemId_setor: {
        itemId: item.id,
        setor: 'Logística'
      }
    },
    update: {
      quantidade_avulsa: 30
    },
    create: {
      itemId: item.id,
      quantidade_avulsa: 30,
      setor: 'Logística'
    }
  });
  console.log('Adicionado 30 ao estoque alternativo para TM-001');
}

main().finally(() => prisma.$disconnect());
