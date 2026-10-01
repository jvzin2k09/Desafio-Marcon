const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.item.updateMany({
    where: { codigo: 'TM-001' },
    data: { qtd_por_caixa: 100 }
  });
  await prisma.item.updateMany({
    where: { codigo: 'TM-002' },
    data: { qtd_por_caixa: 100 }
  });
  await prisma.item.updateMany({
    where: { codigo: 'TM-003' }, // Arruela Lisa
    data: { qtd_por_caixa: 100 }
  });
  await prisma.item.updateMany({
    where: { codigo: 'TM-004' },
    data: { qtd_por_caixa: 10 }
  });
  console.log('Update finished.');
}
main().finally(() => process.exit(0));
