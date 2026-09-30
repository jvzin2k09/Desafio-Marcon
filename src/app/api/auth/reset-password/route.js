import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, pin, novaSenha } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Por favor, informe seu e-mail corporativo.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!novaSenha || novaSenha.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Nenhum usuário corporativo encontrado com este e-mail.' },
        { status: 404 }
      );
    }

    // Hash da nova senha
    const hashedSenha = await bcrypt.hash(novaSenha, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hashedSenha }
    });

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode entrar com a nova senha.'
    });
  } catch (error) {
    console.error('[RESET-PASSWORD] Erro ao redefinir senha:', error);
    return NextResponse.json(
      { error: 'Erro interno ao redefinir a senha. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
