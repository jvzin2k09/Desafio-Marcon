import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ALMOXARIFE') {
      return NextResponse.json({ error: 'Não autorizado. Apenas Almoxarifes podem validar entregas.' }, { status: 403 });
    }

    const { pedidoId, pin } = await request.json();

    if (!pedidoId || !pin) {
      return NextResponse.json({ error: 'ID do pedido e PIN são obrigatórios.' }, { status: 400 });
    }

    // Buscar o pedido e os itens dele para atualizar o estoque
    const pedido = await prisma.pedido.findUnique({
      where: { id: parseInt(pedidoId) },
      include: { 
        user: true,
        itens: true
      }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    if (pedido.status === 'CONCLUIDO') {
      return NextResponse.json({ error: 'Este pedido já foi concluído.' }, { status: 400 });
    }

    // Validar o PIN do Solicitante (Operador)
    let isPinValid = false;
    if (pedido.user.pin === pin) {
      isPinValid = true;
    } else if (pedido.user.pin) {
      try {
        isPinValid = await bcrypt.compare(pin, pedido.user.pin);
      } catch (e) {
        isPinValid = false;
      }
    }

    if (!isPinValid) {
      return NextResponse.json({ error: 'PIN incorreto. Tente novamente.' }, { status: 401 });
    }

    // Transação para dar baixa no estoque e atualizar o pedido
    await prisma.$transaction(async (tx) => {
      // Baixa atômica no estoque para cada item
      for (const itemPedido of pedido.itens) {
        // Considera a quantidade enviada, se preenchido. Caso contrário, a quantidade original
        const qtdParaBaixa = itemPedido.quantidadeEnviada ?? itemPedido.quantidade;
        
        await tx.item.update({
          where: { id: itemPedido.itemId },
          data: {
            quantidade: {
              decrement: qtdParaBaixa
            }
          }
        });
      }

      // Atualiza o pedido como Concluído e grava as datas
      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          status: 'CONCLUIDO',
          pinValidadoEm: new Date(),
          entregueEm: new Date()
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Pedido concluído com sucesso e estoque atualizado!' }, { status: 200 });

  } catch (error) {
    console.error('Erro ao validar PIN no balcão:', error);
    return NextResponse.json({ error: 'Erro interno ao validar o PIN' }, { status: 500 });
  }
}
