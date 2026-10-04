import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const tipo = searchParams.get('tipo');           // 'TODOS' | 'SAIDA' | 'ESTORNO'
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Buscar todos os usuários para mapear almoxarife/responsável
    const allUsers = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, role: true }
    });
    const usersMap = {};
    allUsers.forEach(u => { usersMap[u.id] = u; });

    // Buscar pedidos com itens e estornos
    const pedidos = await prisma.pedido.findMany({
      where: {
        status: {
          in: ['CONCLUIDO', 'ESTORNADO', 'ENTRADA']
        }
      },
      include: {
        user: true,
        itens: {
          include: {
            item: true
          }
        },
        estornos: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Mapear movimentações estruturadas
    let movimentacoes = pedidos.map(p => {
      const isEstorno = p.status === 'ESTORNADO';
      const isEntrada = p.status === 'ENTRADA';
      let tipoMovimentacao = 'SAIDA';
      if (isEstorno) tipoMovimentacao = 'ESTORNO';
      else if (isEntrada) tipoMovimentacao = 'ENTRADA';

      const dataMovimentacao = isEstorno 
        ? (p.estornos[0]?.createdAt || p.updatedAt)
        : (p.entregueEm || p.updatedAt);

      // Descobre quem realizou o estorno se houver
      const responsavelEstornoId = p.estornos[0]?.realizadoPorUserId;
      const responsavelNome = responsavelEstornoId && usersMap[responsavelEstornoId] 
        ? usersMap[responsavelEstornoId].nome 
        : 'Almoxarifado Central';

      const motivoEstorno = p.estornos[0]?.motivo || p.observacao || null;

      const itens = p.itens.map(pi => {
        const qtdEfetiva = pi.quantidadeEnviada !== null && pi.quantidadeEnviada !== undefined 
          ? pi.quantidadeEnviada 
          : pi.quantidade;

        const almoxarifeNome = pi.almoxarife_id && usersMap[pi.almoxarife_id] 
          ? usersMap[pi.almoxarife_id].nome 
          : null;

        return {
          id: pi.id,
          itemId: pi.itemId,
          codigo: pi.item.codigo,
          nome: pi.item.nome,
          unidade: pi.item.unidade,
          quantidadeSolicitada: pi.quantidade,
          quantidadeEfetiva: qtdEfetiva,
          localizacao: pi.item.localizacao || 'Almoxarifado',
          tipo_baixa: pi.tipo_baixa || 'MANUAL',
          observacao_baixa: pi.observacao_baixa,
          data_hora_baixa: pi.data_hora_baixa,
          almoxarifeNome
        };
      });

      const totalQuantidade = itens.reduce((sum, item) => sum + item.quantidadeEfetiva, 0);

      return {
        id: p.id,
        tipo: tipoMovimentacao,
        status: p.status,
        data: dataMovimentacao,
        createdAt: p.createdAt,
        solicitante: {
          id: p.user.id,
          nome: p.user.nome,
          email: p.user.email,
          setor: p.setor || p.user.setor || 'Geral'
        },
        operadorSolicitante: p.operadorSolicitante,
        responsavel: responsavelNome,
        motivo: motivoEstorno,
        observacao: p.observacao,
        totalItens: itens.length,
        totalQuantidade,
        itens
      };
    });

    // 1. Filtro por tipo
    if (tipo && tipo !== 'TODOS') {
      movimentacoes = movimentacoes.filter(m => m.tipo === tipo);
    }

    // 2. Filtro por data inicial
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      movimentacoes = movimentacoes.filter(m => new Date(m.data) >= start);
    }

    // 3. Filtro por data final
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      movimentacoes = movimentacoes.filter(m => new Date(m.data) <= end);
    }

    // 4. Filtro por busca textual
    if (search) {
      movimentacoes = movimentacoes.filter(m => {
        const matchId = m.id.toString().includes(search);
        const matchSolicitante = m.solicitante.nome.toLowerCase().includes(search);
        const matchSetor = m.solicitante.setor.toLowerCase().includes(search);
        const matchMotivo = m.motivo && m.motivo.toLowerCase().includes(search);
        const matchItem = m.itens.some(i => 
          i.nome.toLowerCase().includes(search) || 
          i.codigo.toLowerCase().includes(search)
        );
        return matchId || matchSolicitante || matchSetor || matchMotivo || matchItem;
      });
    }

    return NextResponse.json(movimentacoes);
  } catch (error) {
    console.error('Erro na rota de histórico:', error);
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 });
  }
}
