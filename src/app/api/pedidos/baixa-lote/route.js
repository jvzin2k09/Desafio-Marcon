import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ALMOXARIFE') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { pedidoId, itensBaixados } = data;

    if (!pedidoId || !itensBaixados || !Array.isArray(itensBaixados)) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      let isAnyPartial = false;

      for (const baixa of itensBaixados) {
        const { itemId, quantidadeBaixa, observacao_baixa, pedidoItemId } = baixa;

        // Recupera o item de estoque atual
        const itemEstoque = await tx.item.findUnique({ where: { id: parseInt(itemId) } });
        if (!itemEstoque) throw new Error(`Item ${itemId} não encontrado`);

        if (itemEstoque.quantidade < parseInt(quantidadeBaixa)) {
          throw new Error(`Estoque insuficiente para o item ${itemEstoque.nome}`);
        }

        const pedidoItem = await tx.pedidoitem.findUnique({ where: { id: parseInt(pedidoItemId) } });
        
        if (parseInt(quantidadeBaixa) < pedidoItem.quantidade) {
          isAnyPartial = true;
        }

        // Atualiza o pedidoItem
        await tx.pedidoitem.update({
          where: { id: parseInt(pedidoItemId) },
          data: {
            quantidadeEnviada: parseInt(quantidadeBaixa),
            quantidade_separada: parseInt(quantidadeBaixa),
            observacao_baixa: observacao_baixa || null,
            tipo_baixa: 'QR_CODE',
            almoxarife_id: parseInt(session.user.id),
            data_hora_baixa: new Date(),
          }
        });

        // Baixa no estoque
        await tx.item.update({
          where: { id: parseInt(itemId) },
          data: { quantidade: { decrement: parseInt(quantidadeBaixa) } }
        });
      }

      // Atualiza o pedido
      await tx.pedido.update({
        where: { id: parseInt(pedidoId) },
        data: {
          status: isAnyPartial ? 'ATENDIDO_PARCIALMENTE' : 'CONCLUIDO',
          entregueEm: new Date()
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na baixa em lote:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
