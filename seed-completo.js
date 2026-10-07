const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  SEEDER INDUSTRIAL MARCON / WINE - DEMO PITCH      ');
  console.log('====================================================');

  // Desativa checagem de chaves e limpa tabelas operacionais
  console.log('1. Limpando dados antigos com integridade relacional...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE estorno;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE pedidoitem;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE pedido;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE estoque_alternativo;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE item;');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE user;');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  // -----------------------------------------------------
  // 1. USUÁRIOS FABRIS
  // -----------------------------------------------------
  console.log('2. Inserindo usuários e operadores da fábrica...');
  const usersData = [
    { id: 1, nome: 'Administrador Marcon', email: 'admin@tilmarcon.com.br', senha: '123456', role: 'ADMIN', setor: 'TI' },
    { id: 2, nome: 'Almoxarife Til Marcon', email: 'almoxarife@tilmarcon.com.br', senha: '123456', role: 'ALMOXARIFE', setor: 'Almoxarifado' },
    { id: 3, nome: 'Caio César Dutra', email: 'caio.dutra@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Usinagem' },
    { id: 4, nome: 'João Guilherme Martins', email: 'joao.martins@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Manutenção' },
    { id: 5, nome: 'Ana Caroline Rombi', email: 'ana.rombi@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Montagem' },
    { id: 6, nome: 'João Victor Ramos', email: 'joao.ramos@tilmarcon.com.br', senha: '123456', role: 'ALMOXARIFE', setor: 'Almoxarifado' },
    { id: 7, nome: 'Luis Gustavo Reis', email: 'luis.reis@tilmarcon.com.br', senha: '123456', role: 'ALMOXARIFE', setor: 'Almoxarifado' },
    { id: 8, nome: 'Lucas Alcantara', email: 'lucas.alcantara@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Usinagem' },
    { id: 9, nome: 'Mariana Fernandes', email: 'mariana.fernandes@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Usinagem' },
    { id: 10, nome: 'Roberto Santos', email: 'roberto.santos@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Montagem' },
    // Compatibilidade legada
    { id: 11, nome: 'Responsável 1 (Manutenção)', email: 'responsavel1@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Manutenção' },
    { id: 12, nome: 'Responsável 2 (Usinagem)', email: 'responsavel2@tilmarcon.com.br', senha: '123456', role: 'RESPONSAVEL', setor: 'Usinagem' },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }
  console.log(`   -> ${usersData.length} usuários cadastrados com sucesso.`);

  // -----------------------------------------------------
  // 2. ITENS DE ESTOQUE INDUSTRIAL (13 itens)
  // -----------------------------------------------------
  console.log('3. Inserindo itens industriais (Monitor de Estoque)...');
  const itemsData = [
    // ITENS EM NÍVEL SEGURO
    { id: 1, codigo: 'TM-001', nome: 'Parafuso Sextavado M8x20mm', unidade: 'UN', quantidade: 450, qtd_por_caixa: 100, localizacao: 'A-01-01', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    { id: 2, codigo: 'TM-002', nome: 'Porca Sextavada M8', unidade: 'UN', quantidade: 900, qtd_por_caixa: 200, localizacao: 'A-01-02', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    { id: 3, codigo: 'TM-003', nome: 'Arruela Lisa M8 Zinco', unidade: 'UN', quantidade: 800, qtd_por_caixa: 200, localizacao: 'A-01-03', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    // ITEM EM ESTOQUE BAIXO (ALERTA AMARELO / LARANJA: 3 UN / Mínimo 10 UN)
    { id: 4, codigo: 'TM-004', nome: 'Chapa de Aço Carbono 2mm 1x2m', unidade: 'UN', quantidade: 3, qtd_por_caixa: 1, localizacao: 'B-02-01', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    // NÍVEL SEGURO
    { id: 5, codigo: 'TM-005', nome: 'Tubo Redondo 1 Polegada x 6m', unidade: 'UN', quantidade: 35, qtd_por_caixa: 1, localizacao: 'B-02-02', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    { id: 6, codigo: 'TM-006', nome: 'Fita Crepe Industrial 50mm', unidade: 'UN', quantidade: 85, qtd_por_caixa: 12, localizacao: 'C-01-01', setor: 'Montagem', armazem: 'ALMOXARIFADO' },
    { id: 7, codigo: 'TM-007', nome: 'Luvas Nitrílicas de Proteção CA 123 P', unidade: 'PAR', quantidade: 120, qtd_por_caixa: 10, localizacao: 'EPI-01', setor: 'Montagem', armazem: 'ALMOXARIFADO' },
    { id: 8, codigo: 'TM-008', nome: 'Óculos de Segurança Fumê', unidade: 'UN', quantidade: 65, qtd_por_caixa: 10, localizacao: 'EPI-02', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    { id: 9, codigo: 'TM-009', nome: 'Eletrodo Revestido AWS E6013 2.5mm', unidade: 'KG', quantidade: 400, qtd_por_caixa: 20, localizacao: 'C-02-01', setor: 'Manutenção', armazem: 'ALMOXARIFADO' },
    { id: 10, codigo: 'TM-010', nome: 'Disco de Corte Inox 4.1/2"', unidade: 'UN', quantidade: 180, qtd_por_caixa: 25, localizacao: 'C-02-02', setor: 'Manutenção', armazem: 'ALMOXARIFADO' },
    { id: 11, codigo: 'TM-011', nome: 'Caixa de Papelão 50x40x30cm', unidade: 'UN', quantidade: 320, qtd_por_caixa: 50, localizacao: 'D-01-01', setor: 'Logística', armazem: 'ALMOXARIFADO' },
    { id: 12, codigo: 'TM-012', nome: 'Fita Adesiva Transparente 45mm x 50m', unidade: 'ROLO', quantidade: 90, qtd_por_caixa: 12, localizacao: 'D-01-02', setor: 'Logística', armazem: 'ALMOXARIFADO' },
    // ITEM ESGOTADO (ALERTA VERMELHO CRÍTICO: 0 UN / Mínimo 15 UN)
    { id: 13, codigo: 'TM-013', nome: 'Broca de Aço Rápido HSS 10.0mm', unidade: 'UN', quantidade: 0, qtd_por_caixa: 10, localizacao: 'A-02-04', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
    // ITENS ADICIONAIS EM ESTOQUE BAIXO (Totalizando 3 itens em Estoque Baixo junto com TM-004)
    { id: 14, codigo: 'TM-014', nome: 'Disco Flap Abrasivo 4.1/2" Grão 60', unidade: 'UN', quantidade: 4, qtd_por_caixa: 10, localizacao: 'C-02-03', setor: 'Manutenção', armazem: 'ALMOXARIFADO' },
    { id: 15, codigo: 'TM-015', nome: 'Fluido de Corte Solúvel para Usinagem 5L', unidade: 'GL', quantidade: 2, qtd_por_caixa: 1, localizacao: 'B-03-01', setor: 'Usinagem', armazem: 'ALMOXARIFADO' },
  ];

  for (const item of itemsData) {
    await prisma.item.create({ data: item });
  }
  console.log(`   -> ${itemsData.length} itens industriais criados com localizações e setores.`);

  // -----------------------------------------------------
  // 3. ESTOQUE ALTERNATIVO (SOBRAS REUTILIZÁVEIS)
  // -----------------------------------------------------
  console.log('4. Povoando Estoque Alternativo (sobras em setores fabris)...');
  const sobrasData = [
    { itemId: 1, setor: 'Usinagem', quantidade_avulsa: 30 },
    { itemId: 2, setor: 'Usinagem', quantidade_avulsa: 50 },
    { itemId: 3, setor: 'Usinagem', quantidade_avulsa: 40 },
    { itemId: 5, setor: 'Usinagem', quantidade_avulsa: 2 },
    { itemId: 6, setor: 'Montagem', quantidade_avulsa: 5 },
    { itemId: 7, setor: 'Montagem', quantidade_avulsa: 4 },
    { itemId: 8, setor: 'Usinagem', quantidade_avulsa: 6 },
    { itemId: 9, setor: 'Manutenção', quantidade_avulsa: 8 },
    { itemId: 10, setor: 'Manutenção', quantidade_avulsa: 12 },
    { itemId: 11, setor: 'Logística', quantidade_avulsa: 15 },
    { itemId: 12, setor: 'Logística', quantidade_avulsa: 3 },
    { itemId: 14, setor: 'Manutenção', quantidade_avulsa: 1 },
  ];

  for (const s of sobrasData) {
    await prisma.estoque_alternativo.create({ data: s });
  }
  console.log(`   -> ${sobrasData.length} registros de sobras nos setores fabris.`);

  // -----------------------------------------------------
  // 4. HISTÓRICO DE PEDIDOS (6 a 8 Pedidos Concluídos / ENTREGUE)
  // -----------------------------------------------------
  console.log('5. Criando registros passados para a tela de Histórico (#0010 a #0016)...');
  const agora = Date.now();
  const historicoData = [
    {
      id: 10,
      userId: 3,
      setor: 'Usinagem',
      operadorSolicitante: 'Caio César Dutra',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4310',
      centro_custo: 'CC-3100',
      createdAt: new Date(agora - 120 * 60 * 1000), // 2h atrás
      entregueEm: new Date(agora - 100 * 60 * 1000),
      observacao: 'Atendimento prioritário para torno CNC #03',
      itens: [
        { itemId: 1, quantidade: 200, quantidadeEnviada: 200, quantidade_separada: 200, separado: true, qtd_caixas_central: 2, tipo_baixa: 'QR_CODE', almoxarife_id: 6, observacao_baixa: 'Conferido 100%' },
        { itemId: 2, quantidade: 200, quantidadeEnviada: 200, quantidade_separada: 200, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 6, observacao_baixa: 'Conferido 100%' },
      ]
    },
    {
      id: 11,
      userId: 5,
      setor: 'Montagem',
      operadorSolicitante: 'Ana Caroline Rombi',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4315',
      centro_custo: 'CC-4120',
      createdAt: new Date(agora - 240 * 60 * 1000), // 4h atrás
      entregueEm: new Date(agora - 210 * 60 * 1000),
      observacao: 'Linha de montagem de gabinetes',
      itens: [
        { itemId: 6, quantidade: 24, quantidadeEnviada: 24, quantidade_separada: 24, separado: true, qtd_caixas_central: 2, tipo_baixa: 'QR_CODE', almoxarife_id: 7, observacao_baixa: '2 caixas lacradas' },
      ]
    },
    {
      id: 12,
      userId: 4,
      setor: 'Manutenção',
      operadorSolicitante: 'João Guilherme Martins',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4322',
      centro_custo: 'CC-2200',
      createdAt: new Date(agora - 24 * 3600 * 1000), // Ontem
      entregueEm: new Date(agora - 23 * 3600 * 1000),
      observacao: 'Manutenção preventiva na fresadora F-02',
      itens: [
        { itemId: 10, quantidade: 15, quantidadeEnviada: 15, quantidade_separada: 15, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 6, observacao_baixa: 'Discos conferidos' },
        { itemId: 7, quantidade: 4, quantidadeEnviada: 4, quantidade_separada: 4, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 6, observacao_baixa: 'EPIs liberados' },
      ]
    },
    {
      id: 13,
      userId: 8,
      setor: 'Usinagem',
      operadorSolicitante: 'Lucas Alcantara',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4328',
      centro_custo: 'CC-1050',
      createdAt: new Date(agora - 28 * 3600 * 1000),
      entregueEm: new Date(agora - 27 * 3600 * 1000),
      observacao: 'Fabricação de estrutura metálica padrão',
      itens: [
        { itemId: 5, quantidade: 4, quantidadeEnviada: 4, quantidade_separada: 4, separado: true, qtd_caixas_central: 4, tipo_baixa: 'QR_CODE', almoxarife_id: 2, observacao_baixa: 'Tubos retirados no pátio B' },
      ]
    },
    {
      id: 14,
      userId: 9,
      setor: 'Usinagem',
      operadorSolicitante: 'Mariana Fernandes',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4334',
      centro_custo: 'CC-3100',
      createdAt: new Date(agora - 48 * 3600 * 1000), // 2 dias atrás
      entregueEm: new Date(agora - 47 * 3600 * 1000),
      observacao: 'Fixação dos blocos hidráulicos',
      itens: [
        { itemId: 2, quantidade: 300, quantidadeEnviada: 300, quantidade_separada: 300, separado: true, qtd_caixas_central: 2, tipo_baixa: 'QR_CODE', almoxarife_id: 7, observacao_baixa: 'Conferido' },
        { itemId: 3, quantidade: 300, quantidadeEnviada: 300, quantidade_separada: 300, separado: true, qtd_caixas_central: 2, tipo_baixa: 'QR_CODE', almoxarife_id: 7, observacao_baixa: 'Conferido' },
      ]
    },
    {
      id: 15,
      userId: 10,
      setor: 'Montagem',
      operadorSolicitante: 'Roberto Santos',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4340',
      centro_custo: 'CC-4120',
      createdAt: new Date(agora - 72 * 3600 * 1000), // 3 dias atrás
      entregueEm: new Date(agora - 70 * 3600 * 1000),
      observacao: 'Troca periódica de EPIs da equipe',
      itens: [
        { itemId: 8, quantidade: 20, quantidadeEnviada: 20, quantidade_separada: 20, separado: true, qtd_caixas_central: 2, tipo_baixa: 'QR_CODE', almoxarife_id: 6, observacao_baixa: 'EPIs novos entregues' },
      ]
    },
    {
      id: 16,
      userId: 1,
      setor: 'Logística',
      operadorSolicitante: 'Claudio Mendes',
      status: 'ENTREGUE',
      ordem_producao: 'OP-4355',
      centro_custo: 'CC-5010',
      createdAt: new Date(agora - 96 * 3600 * 1000), // 4 dias atrás
      entregueEm: new Date(agora - 94 * 3600 * 1000),
      observacao: 'Embalagem de lote para expedição',
      itens: [
        { itemId: 11, quantidade: 50, quantidadeEnviada: 50, quantidade_separada: 50, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 2, observacao_baixa: 'Fardo de caixas entregue' },
        { itemId: 12, quantidade: 12, quantidadeEnviada: 12, quantidade_separada: 12, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 2, observacao_baixa: '1 pacote de fitas' },
      ]
    },
  ];

  for (const h of historicoData) {
    const { itens, ...pedidoData } = h;
    await prisma.pedido.create({
      data: {
        ...pedidoData,
        itens: {
          create: itens.map(i => ({
            ...i,
            data_hora_baixa: h.entregueEm || new Date(),
          }))
        }
      }
    });
  }
  console.log(`   -> ${historicoData.length} pedidos finalizados (ENTREGUE) cadastrados no Histórico.`);

  // -----------------------------------------------------
  // 5. KANBAN DE PEDIDOS ATIVOS (#0017 a #0026)
  // -----------------------------------------------------
  console.log('6. Inserindo requisições ativas do Kanban (#0017 a #0026)...');
  const pedidosAtivos = [
    // ─── AGUARDANDO_SEPARACAO (2 a 3 cards com operadores e tempo decorrido 1min, 2min)
    {
      id: 17,
      userId: 1, // Admin para visualização direta no pitch
      setor: 'Usinagem',
      operadorSolicitante: 'Caio César Dutra',
      status: 'AGUARDANDO_SEPARACAO',
      ordem_producao: 'OP-4412',
      centro_custo: 'CC-3100',
      createdAt: new Date(agora - 1 * 60 * 1000), // 1min atrás
      observacao: 'Urgente para finalização do lote de eixos usinados',
      itens: [
        { itemId: 1, quantidade: 50, qtd_caixas_central: 1, qtd_alternativo: 0 },
        { itemId: 2, quantidade: 50, qtd_caixas_central: 1, qtd_alternativo: 0 },
      ]
    },
    {
      id: 18,
      userId: 1,
      setor: 'Manutenção',
      operadorSolicitante: 'João Guilherme Martins',
      status: 'AGUARDANDO_SEPARACAO',
      ordem_producao: 'OP-4415',
      centro_custo: 'CC-2200',
      createdAt: new Date(agora - 2 * 60 * 1000), // 2min atrás
      observacao: 'Troca de discos do esmeril industrial',
      itens: [
        { itemId: 10, quantidade: 5, qtd_caixas_central: 1, qtd_alternativo: 0 },
        { itemId: 7, quantidade: 2, qtd_caixas_central: 1, qtd_alternativo: 0 },
      ]
    },
    {
      id: 19,
      userId: 1,
      setor: 'Usinagem',
      operadorSolicitante: 'Caio César Dutra',
      status: 'AGUARDANDO_SEPARACAO',
      ordem_producao: 'OP-4418',
      centro_custo: 'CC-1050',
      createdAt: new Date(agora - 4 * 60 * 1000), // 4min atrás
      observacao: 'Soldagem e reforço da estrutura de apoio',
      itens: [
        { itemId: 5, quantidade: 2, qtd_caixas_central: 2, qtd_alternativo: 0 },
        { itemId: 9, quantidade: 10, qtd_caixas_central: 1, qtd_alternativo: 0 },
      ]
    },

    // ─── EM_SEPARACAO (2 a 3 cards com operador em separação e tempo decorrido 3min, 5min)
    {
      id: 20,
      userId: 1,
      setor: 'Usinagem',
      operadorSolicitante: 'Mariana Fernandes',
      status: 'EM_SEPARACAO',
      ordem_producao: 'OP-4390',
      centro_custo: 'CC-3100',
      createdAt: new Date(agora - 3 * 60 * 1000), // 3min atrás
      observacao: 'Montagem das buchas guia de precisão',
      itens: [
        { itemId: 3, quantidade: 100, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 6 }, // João Victor Ramos
        { itemId: 8, quantidade: 2, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 6 },
      ]
    },
    {
      id: 21,
      userId: 1,
      setor: 'Montagem',
      operadorSolicitante: 'Roberto Santos',
      status: 'EM_SEPARACAO',
      ordem_producao: 'OP-4395',
      centro_custo: 'CC-4120',
      createdAt: new Date(agora - 5 * 60 * 1000), // 5min atrás
      observacao: 'Isolamento de pintura e proteção de componentes',
      itens: [
        { itemId: 6, quantidade: 12, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 7 }, // Luis Gustavo Reis
        { itemId: 7, quantidade: 6, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 7 },
      ]
    },
    {
      id: 22,
      userId: 1,
      setor: 'Logística',
      operadorSolicitante: 'João Guilherme Martins',
      status: 'EM_SEPARACAO',
      ordem_producao: 'OP-4402',
      centro_custo: 'CC-5010',
      createdAt: new Date(agora - 8 * 60 * 1000), // 8min atrás
      observacao: 'Fechamento de caixas do turno matutino',
      itens: [
        { itemId: 11, quantidade: 20, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 6 }, // João Victor Ramos
        { itemId: 12, quantidade: 4, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 6 },
      ]
    },

    // ─── PRONTO_RETIRADA (2 cards prontos para 'Marcar como entregue')
    {
      id: 23,
      userId: 1,
      setor: 'Montagem',
      operadorSolicitante: 'Ana Caroline Rombi',
      status: 'PRONTO_RETIRADA',
      ordem_producao: 'OP-4375',
      centro_custo: 'CC-4120',
      createdAt: new Date(agora - 20 * 60 * 1000), // 20min atrás
      observacao: 'Aguardando operador na bancada do Almoxarifado Central',
      itens: [
        { itemId: 8, quantidade: 4, quantidadeEnviada: 4, quantidade_separada: 4, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 6, data_hora_baixa: new Date(agora - 5 * 60 * 1000), observacao_baixa: 'Conferido com leitor QR' },
        { itemId: 7, quantidade: 8, quantidadeEnviada: 8, quantidade_separada: 8, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 6, data_hora_baixa: new Date(agora - 5 * 60 * 1000), observacao_baixa: 'Conferido com leitor QR' },
      ]
    },
    {
      id: 24,
      userId: 1,
      setor: 'Usinagem',
      operadorSolicitante: 'Lucas Alcantara',
      status: 'PRONTO_RETIRADA',
      ordem_producao: 'OP-4380',
      centro_custo: 'CC-3100',
      createdAt: new Date(agora - 35 * 60 * 1000), // 35min atrás
      observacao: 'Separado e pronto para transporte até a Usinagem',
      itens: [
        { itemId: 1, quantidade: 100, quantidadeEnviada: 100, quantidade_separada: 100, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 7, data_hora_baixa: new Date(agora - 10 * 60 * 1000), observacao_baixa: 'Separado 1 caixa fechada' },
        { itemId: 2, quantidade: 100, quantidadeEnviada: 100, quantidade_separada: 100, separado: true, qtd_caixas_central: 1, tipo_baixa: 'QR_CODE', almoxarife_id: 7, data_hora_baixa: new Date(agora - 10 * 60 * 1000), observacao_baixa: 'Separado 1 pacote conferido' },
      ]
    },

    // ─── Requisições adicionais para fechar #0017 a #0026
    {
      id: 25,
      userId: 1,
      setor: 'Manutenção',
      operadorSolicitante: 'Caio César Dutra',
      status: 'AGUARDANDO_SEPARACAO',
      ordem_producao: 'OP-4425',
      centro_custo: 'CC-2200',
      createdAt: new Date(agora - 1 * 60 * 1000), // 1min atrás
      observacao: 'Troca de fiação e soldagem do painel elétrico B',
      itens: [
        { itemId: 9, quantidade: 5, qtd_caixas_central: 1, qtd_alternativo: 0 },
        { itemId: 6, quantidade: 3, qtd_caixas_central: 1, qtd_alternativo: 0 },
      ]
    },
    {
      id: 26,
      userId: 1,
      setor: 'Montagem',
      operadorSolicitante: 'Ana Caroline Rombi',
      status: 'EM_SEPARACAO',
      ordem_producao: 'OP-4430',
      centro_custo: 'CC-4120',
      createdAt: new Date(agora - 6 * 60 * 1000), // 6min atrás
      observacao: 'Almoxarife em conferência final de caixas',
      itens: [
        { itemId: 7, quantidade: 10, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 7 }, // Luis Gustavo Reis
        { itemId: 12, quantidade: 6, qtd_caixas_central: 1, qtd_alternativo: 0, almoxarife_id: 7 },
      ]
    },
  ];

  for (const pa of pedidosAtivos) {
    const { itens, ...pedidoData } = pa;
    await prisma.pedido.create({
      data: {
        ...pedidoData,
        itens: {
          create: itens
        }
      }
    });
  }
  console.log(`   -> 10 requisições ativas cadastradas (#0017 a #0026).`);

  console.log('\n====================================================');
  console.log('✅ POVOAMENTO COMPLETO REALIZADO COM SUCESSO!');
  console.log('   - 13 Itens Industriais (1 Seguro, 1 Estoque Baixo, 1 Esgotado)');
  console.log('   - Estoque Alternativo de Sobras configurado em 5 setores');
  console.log('   - 10 Pedidos Ativos no Kanban (#0017 a #0026)');
  console.log('     * 4 em AGUARDANDO_SEPARACAO (1min, 2min, 4min)');
  console.log('     * 4 em EM_SEPARACAO (3min, 5min, 6min, 8min)');
  console.log('     * 2 em PRONTO_RETIRADA (com botão de baixa pronto)');
  console.log('   - 7 Registros completos no Histórico (#0010 a #0016)');
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o povoamento:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
