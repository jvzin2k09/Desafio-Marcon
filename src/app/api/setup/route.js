import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const defaultPassword = await bcrypt.hash('marcon123', 10);
    
    // Create admin user
    const user = await prisma.user.upsert({
      where: { email: 'admin@tilmarcon.com.br' },
      update: {},
      create: {
        email: 'admin@tilmarcon.com.br',
        nome: 'Administrador Marcon',
        senha: defaultPassword,
        role: 'ADMIN',
      },
    });

    // Create a dummy item
    await prisma.item.upsert({
      where: { codigo: 'PAR-M8-100' },
      update: {},
      create: {
        codigo: 'PAR-M8-100',
        nome: 'Parafuso Sextavado M8',
        quantidade: 500,
        localizacao: 'A1-B2',
      },
    });

    return NextResponse.json({ 
      message: 'Setup concluído com sucesso!',
      user: { email: user.email, nome: user.nome, password_hint: 'marcon123' }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao configurar banco de dados' }, { status: 500 });
  }
}
