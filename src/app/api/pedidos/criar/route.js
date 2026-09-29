import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { itens, setor, observacao, operadorSolicitante } = await request.json();

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
    }

    const pedido = await prisma.$transaction(async (tx) => {
      // 1. Criar o pedido
      const novoPedido = await tx.pedido.create({
        data: {
          userId: parseInt(session.user.id),
          setor: setor || null,
          observacao: observacao || null,
          operadorSolicitante: operadorSolicitante || null,
          status: 'AGUARDANDO_SEPARACAO',
          itens: {
            create: itens.map(item => ({
              itemId: parseInt(item.itemId),
              quantidade: parseInt(item.quantidade),
            }))
          }
        },
        include: {
          itens: { include: { item: true } },
          user: true
        }
      });

      // 2. Descontar o estoque de cada item
      for (const reqItem of itens) {
        const itemAtual = await tx.item.findUnique({
          where: { id: parseInt(reqItem.itemId) }
        });

        if (!itemAtual || itemAtual.quantidade < parseInt(reqItem.quantidade)) {
          throw new Error(`Estoque insuficiente para o item ${itemAtual?.nome || reqItem.itemId}`);
        }

        await tx.item.update({
          where: { id: parseInt(reqItem.itemId) },
          data: {
            quantidade: {
              decrement: parseInt(reqItem.quantidade)
            }
          }
        });
      }

      return novoPedido;
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
