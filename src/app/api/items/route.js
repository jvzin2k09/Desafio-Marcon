import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // Permite leitura para painéis de monitoramento e sessões autenticadas
    // O painel foca apenas em EXIBIR o estado atual do estoque sem mutação de dados

    const items = await prisma.item.findMany({
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
