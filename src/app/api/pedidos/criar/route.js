import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

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

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const isMobile = request.headers.get('x-mobile-app') === 'true';

  if (!session && !isMobile) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { itens, setor, observacao, operadorSolicitante, ordem_producao } = await request.json();

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
    }

    const userId = session?.user?.id ? parseInt(session.user.id) : 1;

    const pedido = await prisma.$transaction(async (tx) => {
      // 1. Criar o pedido
      const novoPedido = await tx.pedido.create({
        data: {
          userId: userId,
          setor: setor || null,
          observacao: observacao ? observacao : (ordem_producao ? `OP/CC: ${ordem_producao}` : null),
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

      // Não descontamos mais o estoque na criação. O desconto ocorre fisicamente 
      // quando o almoxarife bipar o QR Code na baixa (baixa-qr/route.js)


      return novoPedido;
    });

    return NextResponse.json(pedido, { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar pedido' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
}
