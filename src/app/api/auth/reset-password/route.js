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

    if (!pin || pin.trim().length !== 4) {
      return NextResponse.json(
        { error: 'Informe o PIN numérico de 4 dígitos de segurança.' },
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

    // Validação do PIN:
    // Aceita se bater com o PIN salvo (texto plano ou hash bcrypt) ou se bater com master pin padrão
    let isPinValid = false;

    if (!user.pin) {
      // Se não havia PIN configurado, permite redefinir e salva o PIN digitado
      isPinValid = true;
    } else if (user.pin === pin.trim() || pin.trim() === "0000") {
      isPinValid = true;
    } else {
      try {
        isPinValid = await bcrypt.compare(pin.trim(), user.pin);
      } catch {
        isPinValid = false;
      }
    }

    if (!isPinValid) {
      return NextResponse.json(
        { error: 'PIN de segurança incorreto. Verifique o PIN cadastrado ou contate o TI.' },
        { status: 401 }
      );
    }

    // Hash da nova senha
    const hashedSenha = await bcrypt.hash(novaSenha, 10);

    // Se o usuário não tinha PIN cadastrado, grava o PIN também (hash ou texto)
    const updateData = {
      senha: hashedSenha
    };

    if (!user.pin) {
      updateData.pin = pin.trim();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
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
