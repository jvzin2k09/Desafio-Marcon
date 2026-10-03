import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

// POST – Criar um item ou importar em lote (CSV)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();

    // ── Importação em lote (CSV) ──────────────────────────────
    if (body.lote && Array.isArray(body.itens)) {
      const resultados = { criados: 0, ignorados: 0, erros: [] };

      for (const row of body.itens) {
        const codigo = (row.codigo || '').trim();
        const nome = (row.nome || '').trim();
        if (!codigo || !nome) {
          resultados.erros.push(`Linha ignorada – código ou nome vazio`);
          continue;
        }

        const quantidade = parseInt(row.quantidade, 10) || 0;
        const qtd_por_caixa = parseInt(row.qtd_por_caixa, 10) || 1;
        const unidade = (row.unidade || 'UN').trim();
        const localizacao = (row.localizacao || '').trim() || null;

        try {
          const existing = await prisma.item.findUnique({ where: { codigo } });
          if (existing) {
            resultados.ignorados++;
          } else {
            await prisma.item.create({
              data: { codigo, nome, quantidade, qtd_por_caixa, unidade, localizacao },
            });
            resultados.criados++;
          }
        } catch (err) {
          resultados.erros.push(`Erro no código "${codigo}": ${err.message}`);
        }
      }

      return NextResponse.json(resultados);
    }

    // ── Criação individual ────────────────────────────────────
    const codigo = (body.codigo || '').trim();
    const nome = (body.nome || '').trim();

    if (!codigo || !nome) {
      return NextResponse.json({ error: 'Código e nome são obrigatórios.' }, { status: 400 });
    }

    const existing = await prisma.item.findUnique({ where: { codigo } });
    if (existing) {
      return NextResponse.json({ error: `Item com código "${codigo}" já existe.` }, { status: 409 });
    }

    const novoItem = await prisma.item.create({
      data: {
        codigo,
        nome,
        quantidade: parseInt(body.quantidade, 10) || 0,
        qtd_por_caixa: parseInt(body.qtd_por_caixa, 10) || 1,
        unidade: (body.unidade || 'UN').trim(),
        localizacao: (body.localizacao || '').trim() || null,
      },
    });

    return NextResponse.json(novoItem, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
