import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { pedidoId } = data;

    if (!pedidoId) {
      return NextResponse.json({ error: 'ID do pedido ausente' }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: parseInt(pedidoId) },
      include: { itens: true }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Deduct from alternative stock for each item that has qtd_alternativo > 0
      for (const pi of pedido.itens) {
        if (pi.qtd_alternativo > 0) {
          // O estoque alternativo já foi deduzido durante a criação do pedido (rota criar/route.js).
          // Portanto, não deduzimos novamente aqui para evitar estoque negativo ou valores distorcidos.
          
          // Also mark this item as having been picked/sent
          await tx.pedidoitem.update({
             where: { id: pi.id },
             data: {
                quantidadeEnviada: pi.qtd_alternativo,
                data_hora_baixa: new Date(),
                almoxarife_id: parseInt(session.user.id),
                tipo_baixa: 'ALTERNATIVA'
             }
          });
        }
      }

      // Move o pedido para PRONTO_RETIRADA
      await tx.pedido.update({
        where: { id: parseInt(pedidoId) },
        data: { 
          status: 'PRONTO_RETIRADA',
          observacao: 'Atendimento via Estoque Alternativo'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao separar pelo alternativo:', error);
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 });
  }
}
