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

  try {
    const { itens, setor, observacao, operadorSolicitante, ordem_producao } = await request.json();

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item informado' }, { status: 400 });
    }

    const pedido = await prisma.$transaction(async (tx) => {
      // Lógica de Roteamento (Estoque Alternativo vs Central)
      const setorFiltro = setor || "Geral";
      const itensComRoteamento = [];

      for (const reqItem of itens) {
        const itemDb = await tx.item.findUnique({ where: { id: parseInt(reqItem.itemId) } });
        if (!itemDb) continue;

        let estoquesAlt = await tx.estoque_alternativo.findMany({
          where: { itemId: itemDb.id, quantidade_avulsa: { gt: 0 } },
          orderBy: { quantidade_avulsa: 'desc' }
        });
        
        let originalQtdPedida = parseInt(reqItem.quantidade);
        let qtdPedida = originalQtdPedida;
        let qtd_alternativo = 0;
        let qtd_caixas_central = 0;
        let sobra_gerada = 0;
        
        // PASSO 1: Consumir de todas as sobras disponíveis para esvaziar o estoque alternativo
        for (let alt of estoquesAlt) {
           if (qtdPedida === 0) break;
           let consumed = Math.min(qtdPedida, alt.quantidade_avulsa);
           qtd_alternativo += consumed;
           qtdPedida -= consumed;
           await tx.estoque_alternativo.update({
             where: { id: alt.id },
             data: { quantidade_avulsa: alt.quantidade_avulsa - consumed }
           });
        }

        // PASSO 2: CÁLCULO DE CAIXAS E SOBRAS CASO AINDA FALTE
        if (qtdPedida > 0) {
          let qtdPorCaixa = itemDb.qtd_por_caixa || 1;
          qtd_caixas_central = Math.ceil(qtdPedida / qtdPorCaixa);
          sobra_gerada = (qtd_caixas_central * qtdPorCaixa) - qtdPedida;
          
          // O saldo remanescente será direcionado ao Almoxarifado Alternativo local do solicitante
          if (sobra_gerada > 0) {
            let altLocal = await tx.estoque_alternativo.findUnique({
              where: { itemId_setor: { itemId: itemDb.id, setor: setorFiltro } }
            });
            if (altLocal) {
              await tx.estoque_alternativo.update({
                where: { id: altLocal.id },
                data: { quantidade_avulsa: altLocal.quantidade_avulsa + sobra_gerada }
              });
            } else {
              await tx.estoque_alternativo.create({
                data: { itemId: itemDb.id, setor: setorFiltro, quantidade_avulsa: sobra_gerada }
              });
            }
          }
        }

        // Deduct from Central Stock immediately so "Disponível" reflects the pending order
        if (qtd_caixas_central > 0) {
          let qtdPorCaixa = itemDb.qtd_por_caixa || 1;
          let descontoCentral = qtd_caixas_central * qtdPorCaixa;
          let novoSaldoCentral = Math.max(0, itemDb.quantidade - descontoCentral);
          await tx.item.update({
            where: { id: itemDb.id },
            data: { quantidade: novoSaldoCentral }
          });
        }

        if (qtd_alternativo > 0) {
          itensComRoteamento.push({
            itemId: itemDb.id,
            quantidade: qtd_alternativo,
            qtd_alternativo,
            qtd_caixas_central: 0,
            sobra_gerada: 0
          });
        }
        if (qtdPedida > 0) {
          itensComRoteamento.push({
            itemId: itemDb.id,
            quantidade: qtdPedida,
            qtd_alternativo: 0,
            qtd_caixas_central,
            sobra_gerada
          });
        }
      }

      // 1. Criar o pedido
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
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar pedido' }, { status: 400 });
  }
}
