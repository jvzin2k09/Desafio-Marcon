const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar todos os itens do banco
  const items = await prisma.item.findMany();
  console.log(`Encontrados ${items.length} itens no banco.`);

  // Para cada item com qtd_por_caixa > 1, criar uma entrada de sobras
  // simulando que caixas foram abertas e sobraram peças
  const sobrasConfig = [
    { codigo: 'TM-001', setor: 'Usinagem', sobras: 30 },    // Parafuso (caixa=100)
    { codigo: 'TM-002', setor: 'Usinagem', sobras: 50 },    // Porca (caixa=200)
    { codigo: 'TM-003', setor: 'Manutenção', sobras: 80 },  // Arruela (caixa=200)
    { codigo: 'TM-006', setor: 'Montagem', sobras: 5 },     // Fita Crepe (caixa=12)
    { codigo: 'TM-007', setor: 'Montagem', sobras: 3 },     // Luva (caixa=10)
    { codigo: 'TM-009', setor: 'Manutenção', sobras: 8 },   // Eletrodo (caixa=20)
    { codigo: 'TM-010', setor: 'Manutenção', sobras: 12 },  // Disco de Corte (caixa=25)
    { codigo: 'TM-011', setor: 'Logística', sobras: 15 },   // Caixa Papelão (caixa=50)
  ];

  for (const cfg of sobrasConfig) {
    const item = items.find(i => i.codigo === cfg.codigo);
    if (!item) {
      console.log(`Item ${cfg.codigo} nao encontrado, pulando...`);
      continue;
    }

    await prisma.estoque_alternativo.upsert({
      where: {
        itemId_setor: {
          itemId: item.id,
          setor: cfg.setor
        }
      },
      update: {
        quantidade_avulsa: cfg.sobras
      },
      create: {
        itemId: item.id,
        quantidade_avulsa: cfg.sobras,
        setor: cfg.setor
      }
    });
    console.log(`[OK] ${cfg.codigo} (${item.nome}) -> ${cfg.sobras} UN sobras no setor ${cfg.setor}`);
  }

  console.log('\nSeed de estoque alternativo concluido!');
}

main().finally(() => prisma.$disconnect());
