const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pedido = await prisma.pedido.findUnique({
    where: { id: 1 },
    include: { itens: true }
  });
  console.log('Pedido #1 status:', pedido?.status);
  console.log('Itens:');
  pedido?.itens.forEach(i => {
    console.log(`  Item ${i.itemId}: separado=${i.separado}, enviada=${i.quantidadeEnviada}, data_hora_baixa=${i.data_hora_baixa}`);
  });
}

main().then(() => prisma.$disconnect());
