const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Inserindo itens de logística...');
    
    await prisma.item.upsert({
      where: { codigo: 'TM-011' },
      update: {},
      create: {
        codigo: 'TM-011',
        nome: 'Caixa de Papelão 50x40x30cm',
        unidade: 'UN',
        quantidade: 500,
        localizacao: 'D-01-01'
      }
    });

    await prisma.item.upsert({
      where: { codigo: 'TM-012' },
      update: {},
      create: {
        codigo: 'TM-012',
        nome: 'Fita Adesiva Transparente 45mm x 50m',
        unidade: 'ROLO',
        quantidade: 150,
        localizacao: 'D-01-02'
      }
    });

    console.log('Itens inseridos com sucesso!');
  } catch(e) {
    console.error('Erro ao inserir itens:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
