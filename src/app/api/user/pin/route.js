import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { pin } = await request.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'O PIN deve conter exatamente 4 dígitos numéricos' }, { status: 400 });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: { id: parseInt(session.user.id) },
      data: { pin: hashedPin },
    });

    return NextResponse.json({ success: true, message: 'PIN cadastrado com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao salvar PIN:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar o PIN' }, { status: 500 });
  }
}
