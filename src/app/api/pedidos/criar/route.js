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
    const { itens, setor, observacao } = await request.json();

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
    }

    const pedido = await prisma.pedido.create({
      data: {
        userId: parseInt(session.user.id),
        setor: setor || null,
        observacao: observacao || null,
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

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
