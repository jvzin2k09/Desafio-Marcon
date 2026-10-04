import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const SETORES_VALIDOS = ['Geral', 'Usinagem', 'Logística', 'Manutenção', 'Montagem'];

function normalizarTexto(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// POST – Criar um item ou importar em lote (CSV)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();

    // Buscar todos os itens existentes para validação anti-duplicação
    const todosItens = await prisma.item.findMany({
      select: { codigo: true, nome: true },
    });
    const codigosExistentes = new Set(todosItens.map(i => i.codigo.trim().toLowerCase()));
    const nomesExistentes = new Set(todosItens.map(i => normalizarTexto(i.nome)));

    // ── Importação em lote (CSV) ──────────────────────────────
    if (body.lote && Array.isArray(body.itens)) {
      const resultados = { criados: 0, ignorados: 0, erros: [] };
      
      // Set para checar duplicatas internas do CSV
      const codigosCsv = new Set();
      const nomesCsv = new Set();

      for (const row of body.itens) {
        const codigo = (row.codigo || '').trim();
        const nome = (row.nome || '').trim();
        if (!codigo || !nome) {
          resultados.erros.push(`Linha ignorada – código ou nome vazio`);
          resultados.ignorados++;
          continue;
        }

        const codigoNorm = codigo.toLowerCase();
        const nomeNorm = normalizarTexto(nome);
        const setor = (row.setor || '').trim() || 'Geral';

        // Checar duplicidade contra banco existente
        if (codigosExistentes.has(codigoNorm) || nomesExistentes.has(nomeNorm)) {
          resultados.ignorados++;
          continue;
        }

        // Checar duplicidade interna do CSV
        if (codigosCsv.has(codigoNorm) || nomesCsv.has(nomeNorm)) {
          resultados.ignorados++;
          continue;
        }

        const quantidade = parseInt(row.quantidade, 10) || 0;
        const qtd_por_caixa = parseInt(row.qtd_por_caixa, 10) || 1;
        const unidade = (row.unidade || 'UN').trim();
        const localizacao = (row.localizacao || '').trim() || null;
        const setorFinal = SETORES_VALIDOS.includes(setor) ? setor : 'Geral';

        try {
          await prisma.item.create({
            data: { codigo, nome, quantidade, qtd_por_caixa, unidade, localizacao, setor: setorFinal },
          });
          resultados.criados++;
          codigosCsv.add(codigoNorm);
          nomesCsv.add(nomeNorm);
          // Adicionar ao set de existentes para próximas linhas
          codigosExistentes.add(codigoNorm);
          nomesExistentes.add(nomeNorm);
        } catch (err) {
          resultados.erros.push(`Erro no código "${codigo}": ${err.message}`);
          resultados.ignorados++;
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

    // Validar duplicidade por código
    if (codigosExistentes.has(codigo.toLowerCase())) {
      return NextResponse.json({ error: `Item com código "${codigo}" já existe.`, campo: 'codigo' }, { status: 409 });
    }

    // Validar duplicidade por descrição (nome)
    if (nomesExistentes.has(normalizarTexto(nome))) {
      return NextResponse.json({ error: `Já existe uma peça cadastrada com esta descrição: "${nome}".`, campo: 'nome' }, { status: 409 });
    }

    const setor = (body.setor || 'Geral').trim();
    const setorFinal = SETORES_VALIDOS.includes(setor) ? setor : 'Geral';

    const novoItem = await prisma.item.create({
      data: {
        codigo,
        nome,
        quantidade: parseInt(body.quantidade, 10) || 0,
        qtd_por_caixa: parseInt(body.qtd_por_caixa, 10) || 1,
        unidade: (body.unidade || 'UN').trim(),
        localizacao: (body.localizacao || '').trim() || null,
        setor: setorFinal,
      },
    });

    return NextResponse.json(novoItem, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar item:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
