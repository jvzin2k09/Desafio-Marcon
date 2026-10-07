import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendStockAlertEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetEmail = searchParams.get('to') || 'joao.v.coelho14@aluno.senai.br';
    const itemCode = searchParams.get('codigo') || 'TM-004'; // Padrão: Chapa de Aço (Estoque Baixo)

    let item = await prisma.item.findUnique({
      where: { codigo: itemCode },
      include: { estoques_alt: true },
    });

    if (!item) {
      item = {
        codigo: 'TM-004',
        nome: 'Chapa de Aço Carbono 2mm 1x2m',
        quantidade: 3,
        unidade: 'UN',
        setor: 'Usinagem',
        localizacao: 'B-02-01',
        limiteMinimo: 10,
      };
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const painelUrl = `${protocol}://${host}/painel-estoque`;

    const result = await sendStockAlertEmail({
      item,
      quantidadeAtual: item.quantidade,
      limiteMinimo: item.limiteMinimo || 10,
      setor: item.setor,
      localizacao: item.localizacao,
      destinatario: targetEmail,
      painelUrl,
    });

    return NextResponse.json({
      message: 'Disparo de e-mail de alerta executado',
      destinatario: targetEmail,
      item: {
        codigo: item.codigo,
        nome: item.nome,
        quantidadeAtual: item.quantidade,
        limiteMinimo: item.limiteMinimo || 10,
        unidade: item.unidade,
      },
      ...result,
    });
  } catch (error) {
    console.error('Erro na rota /api/alertas/email GET:', error);
    return NextResponse.json(
      { error: 'Falha ao disparar alerta de e-mail', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      itemId,
      codigo,
      quantidadeAtual,
      limiteMinimo,
      destinatario = 'joao.v.coelho14@aluno.senai.br',
    } = body;

    let item = null;
    if (itemId) {
      item = await prisma.item.findUnique({ where: { id: parseInt(itemId) } });
    } else if (codigo) {
      item = await prisma.item.findUnique({ where: { codigo } });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const painelUrl = `${protocol}://${host}/painel-estoque`;

    const result = await sendStockAlertEmail({
      item: item || {
        codigo: codigo || 'TM-004',
        nome: body.nome || 'Chapa de Aço Carbono 2mm 1x2m',
        unidade: body.unidade || 'UN',
        setor: body.setor || 'Usinagem',
        localizacao: body.localizacao || 'B-02-01',
      },
      quantidadeAtual: quantidadeAtual !== undefined ? quantidadeAtual : (item?.quantidade ?? 3),
      limiteMinimo: limiteMinimo !== undefined ? limiteMinimo : (item?.limiteMinimo ?? 10),
      setor: body.setor || item?.setor,
      localizacao: body.localizacao || item?.localizacao,
      destinatario,
      painelUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro na rota /api/alertas/email POST:', error);
    return NextResponse.json(
      { error: 'Falha ao processar alerta', details: error.message },
      { status: 500 }
    );
  }
}
