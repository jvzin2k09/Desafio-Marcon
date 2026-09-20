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
    const estornos = await prisma.estorno.findMany({
      include: {
        item: true,
        pedido: {
          include: {
            user: true,
            itens: {
              include: {
                item: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(estornos);
  } catch (error) {
    console.error('Erro ao buscar estornos:', error);
    return NextResponse.json({ error: 'Erro ao buscar estornos' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { pedidoId, motivo } = data;

    if (!pedidoId) {
      return NextResponse.json({ error: 'ID do pedido obrigatório' }, { status: 400 });
    }

    if (!motivo || !motivo.trim()) {
      return NextResponse.json({ error: 'Motivo do estorno obrigatório' }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: parseInt(pedidoId) },
      include: { itens: true }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (pedido.status === 'ESTORNADO') {
      return NextResponse.json({ error: 'Este pedido já foi estornado' }, { status: 400 });
    }

    const userId = parseInt(session.user.id) || 1;

    await prisma.$transaction(async (tx) => {
      // 1. Se o pedido já havia sido concluído (baixa no estoque efetuada), devolve os itens ao estoque
      if (pedido.status === 'CONCLUIDO') {
        for (const pi of pedido.itens) {
          const qtdDevolvida = pi.quantidadeEnviada ?? pi.quantidade;
          await tx.item.update({
            where: { id: pi.itemId },
            data: {
              quantidade: {
                increment: qtdDevolvida
              }
            }
          });
        }
      }

      // 2. Registra o estorno para cada item do pedido
      for (const pi of pedido.itens) {
        const qtdEstornada = pi.quantidadeEnviada ?? pi.quantidade;
        await tx.estorno.create({
          data: {
            pedidoId: pedido.id,
            itemId: pi.itemId,
            quantidadeEstornada: qtdEstornada,
            motivo: motivo.trim(),
            realizadoPorUserId: userId
          }
        });
      }

      // 3. Atualiza o status do pedido para ESTORNADO e grava a observação
      await tx.pedido.update({
        where: { id: pedido.id },
        data: {
          status: 'ESTORNADO',
          observacao: motivo.trim()
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Pedido estornado com sucesso!' });
  } catch (error) {
    console.error('Erro ao realizar estorno:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar estorno' }, { status: 500 });
  }
}
