import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { itemId, quantidade, motivo } = await request.json();

    if (!itemId || !quantidade || quantidade <= 0 || !motivo) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Usar uma transação para atualizar o item e registrar o histórico
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Atualizar a quantidade do item
      const item = await tx.item.update({
        where: { id: itemId },
        data: {
          quantidade: {
            increment: quantidade
          }
        }
      });

      // 2. Registrar no histórico como um "pedido" do tipo ENTRADA
      const pedido = await tx.pedido.create({
        data: {
          userId: session.user.id,
          setor: 'Administração',
          operadorSolicitante: session.user.nome,
          status: 'ENTRADA',
          observacao: motivo,
          entregueEm: new Date(),
          itens: {
            create: [
              {
                itemId: item.id,
                quantidade: quantidade,
                quantidadeEnviada: quantidade,
                separado: true,
                tipo_baixa: 'MANUAL',
                almoxarife_id: session.user.id,
                data_hora_baixa: new Date()
              }
            ]
          }
        }
      });

      return { item, pedido };
    });

    return NextResponse.json({
      success: true,
      novoSaldo: resultado.item.quantidade,
      codigo: resultado.item.codigo
    });

  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    return NextResponse.json({ error: 'Erro ao registrar entrada de estoque' }, { status: 500 });
  }
}
