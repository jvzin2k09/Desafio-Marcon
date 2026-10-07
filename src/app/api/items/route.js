import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // Permite leitura para painéis de monitoramento e sessões autenticadas
    // O painel foca apenas em EXIBIR o estado atual do estoque sem mutação de dados

    const items = await prisma.item.findMany({
      include: {
        estoques_alt: true
      },
      orderBy: { nome: 'asc' },
    });

    const LIMITES_PADRAO = {
      'TM-001': 50,  // Parafuso Sextavado M8x20mm
      'TM-002': 100, // Porca Sextavada M8
      'TM-003': 100, // Arruela Lisa M8 Zinco
      'TM-004': 10,  // Chapa de Aço Carbono 2mm (Estoque Baixo)
      'TM-005': 5,   // Tubo Redondo 1"
      'TM-006': 15,  // Fita Crepe Industrial
      'TM-007': 20,  // Luvas Nitrílicas
      'TM-008': 10,  // Óculos de Segurança Fumê
      'TM-009': 30,  // Eletrodo Revestido
      'TM-010': 25,  // Discos de Corte 4.5"
      'TM-011': 50,  // Caixa de Papelão
      'TM-012': 12,  // Fita Adesiva Transparente
      'TM-013': 15,  // Broca de Aço Rápido HSS 10.0mm (Esgotado)
      'TM-014': 20,  // Disco Flap Abrasivo 4.1/2" Grão 60 (Estoque Baixo)
      'TM-015': 10,  // Fluido de Corte Solúvel para Usinagem 5L (Estoque Baixo)
    };

    const enrichedItems = items.map(item => ({
      ...item,
      limiteMinimo: item.limiteMinimo ?? LIMITES_PADRAO[item.codigo] ?? 10
    }));

    return NextResponse.json(enrichedItems, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
