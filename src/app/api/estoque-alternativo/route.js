import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const estoque = await prisma.estoque_alternativo.findMany({
      include: {
        item: true
      },
      orderBy: {
        quantidade_avulsa: 'desc'
      }
    });

    return NextResponse.json(estoque);
  } catch (error) {
    console.error('Erro ao buscar estoque alternativo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
