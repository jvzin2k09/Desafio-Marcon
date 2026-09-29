const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        status: {
          in: ['CONCLUIDO', 'ESTORNADO']
        }
      },
      include: {
        user: true,
        itens: {
          include: {
            item: true
          }
        },
        estornos: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    console.log(pedidos.length);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
