import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pedido = await prisma.pedido.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        itens: {
          include: {
            item: true
          }
        }
      }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Erro ao buscar detalhes do pedido:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { itensEnviados } = body;

    if (!itensEnviados || !Array.isArray(itensEnviados)) {
      return NextResponse.json({ error: 'Dados de envio inválidos' }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: parseInt(id) },
      include: { itens: true }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (pedido.status === 'CONCLUIDO') {
      return NextResponse.json({ error: 'Pedido já foi concluído' }, { status: 400 });
    }

    // Processar a baixa usando transação para garantir que todos os estoques sejam deduzidos corretamente
    await prisma.$transaction(async (tx) => {
      // Deduzir o estoque de cada item do pedido com base na quantidade enviada
      for (const itemEnviado of itensEnviados) {
        const pedidoItem = pedido.itens.find(i => i.id === itemEnviado.id);
        if (!pedidoItem) continue;

        const qtdeEnviada = parseInt(itemEnviado.quantidadeEnviada);

        // Deduzir o estoque
        await tx.item.update({
          where: { id: pedidoItem.itemId },
          data: {
            quantidade: {
              decrement: qtdeEnviada
            }
          }
        });

        // Atualizar o pedidoItem com o que realmente foi enviado
        await tx.pedidoItem.update({
          where: { id: pedidoItem.id },
          data: { 
            separado: true,
            quantidadeEnviada: qtdeEnviada
          }
        });
      }

      // Atualizar o status do pedido para concluído
      await tx.pedido.update({
        where: { id: parseInt(id) },
        data: { status: 'CONCLUIDO' }
      });
    });

    return NextResponse.json({ success: true, message: 'Separação concluída e baixa realizada' });
  } catch (error) {
    console.error('Erro ao concluir separação:', error);
    return NextResponse.json({ error: 'Erro ao concluir separação' }, { status: 500 });
  }
}
