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

export async function PUT(req) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id, novaQuantidade } = await req.json();

    if (!id || typeof novaQuantidade !== 'number') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const atualizado = await prisma.estoque_alternativo.update({
      where: { id },
      data: { quantidade_avulsa: novaQuantidade }
    });

    return NextResponse.json(atualizado);
  } catch (error) {
    console.error('Erro ao atualizar saldo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
