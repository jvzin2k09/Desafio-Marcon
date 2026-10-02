import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'JSON inválido', detail: e.message }, { status: 400 });
  }

  const { itens, setor, observacao, operadorSolicitante, ordem_producao } = body;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
  }

  // setorFiltro nunca pode ser null/undefined — o upsert depende de uma string válida
  const setorFiltro = (setor && setor.trim()) ? setor.trim() : "Geral";

  try {
    const pedido = await prisma.$transaction(async (tx) => {
      const itensComRoteamento = [];

      for (const reqItem of itens) {
        const itemDb = await tx.item.findUnique({ where: { id: parseInt(reqItem.itemId) } });
        if (!itemDb) continue;

        let estoqueAlt = null;
        try {
          estoqueAlt = await tx.estoque_alternativo.findUnique({
            where: { itemId_setor: { itemId: itemDb.id, setor: setorFiltro } }
          });
        } catch (e) {
          // Se falhar, continua sem estoque alternativo
          console.error('Erro ao buscar estoque alternativo:', e.message);
        }

        let qtdPedida = parseInt(reqItem.quantidade) || 1;
        let qtd_alternativo = 0;
        let qtd_caixas_central = 0;
        let sobra_gerada = 0;
        let avulsaDisponivel = estoqueAlt ? (estoqueAlt.quantidade_avulsa || 0) : 0;

        if (avulsaDisponivel >= qtdPedida) {
          qtd_alternativo = qtdPedida;
          avulsaDisponivel -= qtdPedida;
        } else {
          qtd_alternativo = avulsaDisponivel;
          let restante = qtdPedida - qtd_alternativo;
          let qtdPorCaixa = itemDb.qtd_por_caixa || 1;
          qtd_caixas_central = Math.ceil(restante / qtdPorCaixa);
          sobra_gerada = (qtd_caixas_central * qtdPorCaixa) - restante;
          avulsaDisponivel = sobra_gerada;
        }

        try {
          await tx.estoque_alternativo.upsert({
            where: { itemId_setor: { itemId: itemDb.id, setor: setorFiltro } },
            update: { quantidade_avulsa: Math.max(0, avulsaDisponivel) },
            create: { itemId: itemDb.id, setor: setorFiltro, quantidade_avulsa: Math.max(0, avulsaDisponivel) }
          });
        } catch (e) {
          console.error('Erro no upsert estoque_alternativo:', e.message);
          // Tenta de outra forma se upsert falhar
        }

        if (qtd_caixas_central > 0) {
          let qtdPorCaixa = itemDb.qtd_por_caixa || 1;
          let descontoCentral = qtd_caixas_central * qtdPorCaixa;
          let novoSaldoCentral = Math.max(0, itemDb.quantidade - descontoCentral);
          await tx.item.update({
            where: { id: itemDb.id },
            data: { quantidade: novoSaldoCentral }
          });
        }

        itensComRoteamento.push({
          itemId: itemDb.id,
          quantidade: qtdPedida,
          qtd_alternativo,
          qtd_caixas_central,
          sobra_gerada
        });
      }

      if (itensComRoteamento.length === 0) {
        throw new Error('Nenhum item válido encontrado no estoque.');
      }

      const novoPedido = await tx.pedido.create({
        data: {
          userId: parseInt(session.user.id),
          setor: setor || null,
          observacao: observacao || null,
          operadorSolicitante: operadorSolicitante || null,
          ordem_producao: ordem_producao || null,
          status: 'AGUARDANDO_SEPARACAO',
          itens: {
            create: itensComRoteamento
          }
        },
        include: {
          itens: { include: { item: true } },
          user: true
        }
      });

      return novoPedido;
    }, {
      timeout: 15000 // 15 segundos de timeout para a transação
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('=== Erro ao criar pedido ===');
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      error: error.message || 'Erro ao criar pedido',
      code: error.code
    }, { status: 400 });
  }
}
