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

        let estoqueAlt = await tx.estoque_alternativo.findUnique({
          where: { itemId_setor: { itemId: itemDb.id, setor: setorFiltro } }
        });
        
        let qtdPedida = parseInt(reqItem.quantidade);
        let qtd_alternativo = 0;
        let qtd_caixas_central = 0;
        let sobra_gerada = 0;
        let avulsaDisponivel = estoqueAlt ? estoqueAlt.quantidade_avulsa : 0;

        // PASSO 1: O sistema consulta primeiro a tabela EstoqueAlternativo.
        if (avulsaDisponivel >= qtdPedida) {
          qtd_alternativo = qtdPedida;
          avulsaDisponivel -= qtdPedida;
        } else {
          // PASSO 2: CÁLCULO DE CAIXAS E SOBRAS
          qtd_alternativo = avulsaDisponivel;
          let restante = qtdPedida - qtd_alternativo;
          
          let qtdPorCaixa = itemDb.qtd_por_caixa || 1;
          qtd_caixas_central = Math.ceil(restante / qtdPorCaixa);
          sobra_gerada = (qtd_caixas_central * qtdPorCaixa) - restante;
          
          // O saldo remanescente será direcionado ao Almoxarifado Alternativo local
          avulsaDisponivel = sobra_gerada;
        }

        // Registra/Atualiza a sobra no EstoqueAlternativo
        await tx.estoque_alternativo.upsert({
          where: { itemId_setor: { itemId: itemDb.id, setor: setorFiltro } },
          update: { quantidade_avulsa: avulsaDisponivel },
          create: { itemId: itemDb.id, setor: setorFiltro, quantidade_avulsa: avulsaDisponivel }
        });

        itensComRoteamento.push({
          itemId: itemDb.id,
          quantidade: qtdPedida,
          qtd_alternativo,
          qtd_caixas_central,
          sobra_gerada
        });
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

      // Não descontamos mais o estoque na criação. O desconto ocorre fisicamente 
      // quando o almoxarife bipar o QR Code na baixa (baixa-qr/route.js)

      return novoPedido;
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar pedido' }, { status: 400 });
  }
}
