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
    const { pedidoId, itemId, quantidadeBaixa, observacao_baixa } = data;

    if (!pedidoId || !itemId || !quantidadeBaixa) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const pedidoItem = await prisma.pedidoitem.findFirst({
      where: { pedidoId: parseInt(pedidoId), itemId: parseInt(itemId) },
      include: { item: true }
    });

    if (!pedidoItem) {
      return NextResponse.json({ error: 'Item não encontrado no pedido' }, { status: 404 });
    }

    if (pedidoItem.item.quantidade < parseInt(quantidadeBaixa)) {
      return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Atualiza o pedidoItem
      await tx.pedidoitem.update({
        where: { id: pedidoItem.id },
        data: {
          quantidadeEnviada: parseInt(quantidadeBaixa),
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

      // Verifica se todos os itens do pedido já tiveram baixa
      const allItens = await tx.pedidoitem.findMany({
        where: { pedidoId: parseInt(pedidoId) }
      });

      const allDelivered = allItens.every(i => i.data_hora_baixa !== null);

      if (allDelivered) {
        await tx.pedido.update({
          where: { id: parseInt(pedidoId) },
          data: {
            status: 'CONCLUIDO',
            entregueEm: new Date()
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na baixa via QR Code:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
