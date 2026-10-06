import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || !['ALMOXARIFE', 'ADMIN'].includes(session.user.role)) {
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

        const qtdBaixa = parseInt(quantidadeBaixa);

        const pedidoItem = await tx.pedidoitem.findUnique({ where: { id: parseInt(pedidoItemId) } });
        if (!pedidoItem) continue;

        if (qtdBaixa < pedidoItem.quantidade) {
          isAnyPartial = true;
        }

        // Atualiza o pedidoItem
        await tx.pedidoitem.update({
          where: { id: parseInt(pedidoItemId) },
          data: {
            quantidadeEnviada: qtdBaixa,
            quantidade_separada: qtdBaixa,
            separado: true,
            observacao_baixa: observacao_baixa || null,
            tipo_baixa: 'QR_CODE',
            almoxarife_id: parseInt(session.user.id),
            data_hora_baixa: new Date(),
          }
        });

        // O estoque já foi reduzido na criação do pedido, não deduzir novamente.
      }

      // Atualiza o pedido para PRONTO_RETIRADA
      await tx.pedido.update({
        where: { id: parseInt(pedidoId) },
        data: {
          status: 'PRONTO_RETIRADA'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na baixa em lote:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
