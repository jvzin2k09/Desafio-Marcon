"use server";

import { prisma } from "@/lib/prisma";

export async function getDashboardData(anoSelecionado) {
  const currentYear = anoSelecionado || new Date().getFullYear();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYearNum = currentDate.getFullYear();
  
  // 1. KPI - Total de Requisições
  const firstDayCurrentMonth = new Date(currentYearNum, currentMonth, 1);
  const firstDayNextMonth = new Date(currentYearNum, currentMonth + 1, 1);
  
  const firstDayLastMonth = new Date(currentYearNum, currentMonth - 1, 1);
  const firstDayThisMonth = new Date(currentYearNum, currentMonth, 1);
  
  const totalReqCurrentMonth = await prisma.pedido.count({
    where: { createdAt: { gte: firstDayCurrentMonth, lt: firstDayNextMonth } }
  });
  
  const totalReqLastMonth = await prisma.pedido.count({
    where: { createdAt: { gte: firstDayLastMonth, lt: firstDayThisMonth } }
  });
  
  let percentReq = 0;
  if (totalReqLastMonth > 0) {
    percentReq = ((totalReqCurrentMonth - totalReqLastMonth) / totalReqLastMonth) * 100;
  } else if (totalReqCurrentMonth > 0) {
    percentReq = 100;
  }

  // Fetch all items for the year
  const firstDayYear = new Date(currentYear, 0, 1);
  const firstDayNextYear = new Date(currentYear + 1, 0, 1);

  const itemsAno = await prisma.pedidoitem.findMany({
    where: { 
      pedido: {
        createdAt: { gte: firstDayYear, lt: firstDayNextYear }
      }
    },
    include: {
      pedido: true
    }
  });

  const estornosAno = await prisma.estorno.findMany({
    where: {
      createdAt: { gte: firstDayYear, lt: firstDayNextYear }
    }
  });

  // Calculate monthly stats
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const barData = Array.from({ length: 12 }, (_, i) => ({
    name: months[i],
    sobras: 0,
    atendimento: 0,
    devolucoes: 0,
    pendente: 0
  }));

  let totalSobrasAno = 0;
  let totalMovimentadoAno = 0;
  const pieMap = {};

  itemsAno.forEach(pi => {
    const month = new Date(pi.pedido.createdAt).getMonth();
    const sobras = pi.qtd_alternativo || 0;
    const qtySent = pi.quantidade_separada || pi.quantidadeEnviada || 0;
    
    // Atendimento Central is anything sent that didn't come from sobras
    const atendimento = qtySent > sobras ? qtySent - sobras : 0;
    
    // Pendente is what was requested but not sent yet
    const pendente = pi.quantidade > qtySent ? pi.quantidade - qtySent : 0;
    
    barData[month].sobras += sobras;
    barData[month].atendimento += atendimento;
    barData[month].pendente += pendente;

    totalSobrasAno += sobras;
    totalMovimentadoAno += (sobras + atendimento + pendente);

    const setor = pi.pedido?.setor || 'Outros';
    if (!pieMap[setor]) pieMap[setor] = 0;
    pieMap[setor] += qtySent;
  });

  estornosAno.forEach(est => {
    const month = new Date(est.createdAt).getMonth();
    barData[month].devolucoes += est.quantidadeEstornada;
    totalMovimentadoAno += est.quantidadeEstornada;
  });

  // KPI 2: Taxa de Reuso Lean
  let taxaReusoLean = 0;
  if (totalMovimentadoAno > 0) {
    taxaReusoLean = ((totalSobrasAno / totalMovimentadoAno) * 100).toFixed(1);
  }

  // format pie data with fixed sectors
  const fixedSectors = [
    { name: 'Usinagem', value: pieMap['Usinagem'] || 0 },
    { name: 'Logística', value: pieMap['Logística'] || pieMap['Logistica'] || 0 },
    { name: 'Manutenção', value: pieMap['Manutenção'] || pieMap['Manutencao'] || 0 },
    { name: 'Montagem', value: pieMap['Montagem'] || 0 }
  ];

  const pieData = fixedSectors;

  return {
    kpi: {
      totalReqCurrentMonth,
      percentReq: percentReq.toFixed(1),
      taxaReusoLean
    },
    barData,
    pieData,
    totalSetores: pieData.reduce((acc, curr) => acc + curr.value, 0)
  };
}
