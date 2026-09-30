import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-mobile-app',
    },
  });
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const isMobile = request.headers.get('x-mobile-app') === 'true';

  if (!session && !isMobile) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const vinteQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pedidos = await prisma.pedido.findMany({
      where: {
        OR: [
          { status: { notIn: ['CONCLUIDO', 'ESTORNADO'] } },
          { 
            status: { in: ['CONCLUIDO', 'ESTORNADO'] },
            updatedAt: { gte: vinteQuatroHorasAtras }
          }
        ]
      },
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

    return NextResponse.json(pedidos, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  const isMobile = request.headers.get('x-mobile-app') === 'true';

  if (!session && !isMobile) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { id, status, itensEnviados, recebedor } = data;

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
        const pedidoItemDelegate = tx.pedidoitem || tx.pedidoItem;
        for (const item of itensEnviados) {
          await pedidoItemDelegate.update({
            where: { id: parseInt(item.id) },
            data: { quantidadeEnviada: parseInt(item.quantidadeEnviada) }
          });
        }
      });
      return NextResponse.json({ success: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } else if (status) {
      // Caso não haja itensEnviados na requisição
      await prisma.$transaction(async (tx) => {
        let extraData = {};
        
        if (status === 'CONCLUIDO') {
          extraData.entregueEm = new Date();
          
          const pedido = await tx.pedido.findUnique({
            where: { id: parseInt(id) },
            include: { itens: true }
          });
          
          if (recebedor && pedido) {
            extraData.observacao = pedido.observacao 
              ? `${pedido.observacao}\n[Entregue para: ${recebedor}]` 
              : `[Entregue para: ${recebedor}]`;
          }
          
          if (pedido && pedido.status !== 'CONCLUIDO') {
            for (const pItem of pedido.itens) {
              const qtdDescontar = pItem.quantidadeEnviada !== null ? pItem.quantidadeEnviada : pItem.quantidade;
              if (qtdDescontar > 0) {
                await tx.item.update({
                  where: { id: pItem.itemId },
                  data: { quantidade: { decrement: qtdDescontar } }
                });
              }
            }
          }
        }
        
        await tx.pedido.update({
          where: { id: parseInt(id) },
          data: { status, ...extraData }
        });
      });
      
      return NextResponse.json({ success: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } else {
      return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
