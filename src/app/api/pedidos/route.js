import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      include: {
        user: true,
        itens: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, status, itensEnviados } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID ausente' }, { status: 400 });
    }

    // Se itens foram enviados, atualiza (auto-save ou movimentação)
    if (itensEnviados && Array.isArray(itensEnviados)) {
      await prisma.$transaction(async (tx) => {
        if (status) {
          // Atualiza status do pedido se foi enviado
          await tx.pedido.update({
            where: { id: parseInt(id) },
            data: { status }
          });
        }
        
        // Salva as quantidades digitadas pelo almoxarife
        for (const item of itensEnviados) {
          await tx.pedidoItem.update({
            where: { id: parseInt(item.id) },
            data: { quantidadeEnviada: parseInt(item.quantidadeEnviada) }
          });
        }
      });
      return NextResponse.json({ success: true });
    } else if (status) {
      // Caso não haja itens, mas haja status (ex: Movendo para Em Separação)
      const pedido = await prisma.pedido.update({
        where: { id: parseInt(id) },
        data: { status }
      });
      return NextResponse.json(pedido);
    } else {
      return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}
