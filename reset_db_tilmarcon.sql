-- Script para Reset e Seed - Til Marcon
-- Este script apaga os dados de itens, pedidos, estoque alternativo e estornos
-- e insere uma nova carga de dados simulando os produtos reais da Til Marcon.

SET FOREIGN_KEY_CHECKS=0;

-- 1. Limpando as tabelas
TRUNCATE TABLE `estorno`;
TRUNCATE TABLE `pedidoitem`;
TRUNCATE TABLE `pedido`;
TRUNCATE TABLE `estoque_alternativo`;
TRUNCATE TABLE `item`;

SET FOREIGN_KEY_CHECKS=1;

-- 2. Inserindo os novos itens (Produtos Til Marcon)
INSERT INTO `item` (`codigo`, `nome`, `unidade`, `quantidade`, `qtd_por_caixa`, `localizacao`, `setor`, `armazem`) VALUES
-- FIXAÇÃO (Usinagem / Montagem)
('TM-001', 'Parafuso Sextavado M8x20mm Zincado', 'UN', 5000, 500, 'A-01-01', 'Usinagem', 'ALMOXARIFADO'),
('TM-002', 'Porca Sextavada M8 Zincada', 'UN', 5000, 500, 'A-01-02', 'Usinagem', 'ALMOXARIFADO'),
('TM-003', 'Arruela Lisa M8 Zinco', 'UN', 10000, 1000, 'A-01-03', 'Usinagem', 'ALMOXARIFADO'),
('TM-004', 'Rebite de Repuxo 4.8x12mm (Alumínio)', 'UN', 2000, 200, 'A-02-01', 'Montagem', 'ALMOXARIFADO'),

-- MATÉRIA-PRIMA BRUTA (Corte e Dobra)
('TM-005', 'Chapa de Aço Carbono 2mm 1x2m', 'UN', 150, 1, 'B-01-01', 'Usinagem', 'ALMOXARIFADO'),
('TM-006', 'Tubo Redondo de Aço 1" x 6m (Parede 1.5mm)', 'UN', 200, 10, 'B-02-01', 'Usinagem', 'ALMOXARIFADO'),
('TM-007', 'Cantoneira de Aço 1.1/4" x 1/8" (6m)', 'UN', 120, 10, 'B-02-02', 'Usinagem', 'ALMOXARIFADO'),

-- COMPONENTES (Montagem de Carrinhos e Bancadas)
('TM-008', 'Rodízio Fixo 4" Poliuretano (P/ Carrinho)', 'UN', 400, 20, 'C-01-01', 'Montagem', 'ALMOXARIFADO'),
('TM-009', 'Rodízio Giratório 4" c/ Freio Poliuretano', 'UN', 400, 20, 'C-01-02', 'Montagem', 'ALMOXARIFADO'),
('TM-010', 'Corrediça Telescópica 400mm (P/ Gavetas)', 'PAR', 600, 30, 'C-02-01', 'Montagem', 'ALMOXARIFADO'),
('TM-011', 'Fechadura Cilíndrica para Armário', 'UN', 150, 25, 'C-02-02', 'Montagem', 'ALMOXARIFADO'),
('TM-012', 'Mola de Tração 100mm (P/ Prensas)', 'UN', 120, 10, 'C-03-01', 'Montagem', 'ALMOXARIFADO'),

-- SOLDA E ABRASIVOS
('TM-013', 'Arame de Solda MIG ER70S-6 1.0mm (Rolo 15kg)', 'RL', 80, 1, 'D-01-01', 'Manutenção', 'ALMOXARIFADO'),
('TM-014', 'Eletrodo Revestido AWS E6013 2.5mm', 'KG', 150, 20, 'D-01-02', 'Manutenção', 'ALMOXARIFADO'),
('TM-015', 'Disco de Corte Inox 4.1/2" x 1.0mm', 'UN', 1000, 50, 'D-02-01', 'Usinagem', 'ALMOXARIFADO'),
('TM-016', 'Disco Flap Grão 60 4.1/2"', 'UN', 500, 25, 'D-02-02', 'Usinagem', 'ALMOXARIFADO'),

-- PINTURA E ACABAMENTO
('TM-017', 'Tinta Pó Epóxi Azul Marcon (Caixa 25kg)', 'CX', 40, 1, 'P-01-01', 'Logística', 'ALMOXARIFADO'),
('TM-018', 'Fita Crepe Industrial Resistente 50mm x 50m', 'RL', 300, 24, 'P-01-02', 'Logística', 'ALMOXARIFADO'),
('TM-019', 'Solvente Redutor para Limpeza (Lata 18L)', 'LT', 30, 1, 'P-02-01', 'Logística', 'ALMOXARIFADO'),

-- MANUTENÇÃO HIDRÁULICA (Prensas, Macacos, Guinchos)
('TM-020', 'Macaco Hidráulico Reposição 2 Toneladas', 'UN', 20, 1, 'M-01-01', 'Manutenção', 'ALMOXARIFADO'),
('TM-021', 'Reparo (Gaxeta/Anel O-Ring) para Pistão 4T', 'KIT', 150, 10, 'M-01-02', 'Manutenção', 'ALMOXARIFADO'),
('TM-022', 'Óleo Hidráulico AW 68 (Tambor 200L)', 'TB', 5, 1, 'M-02-01', 'Manutenção', 'ALMOXARIFADO'),

-- EPIS E DIVERSOS (Logística)
('TM-023', 'Luva de Proteção CA 123 PU', 'PAR', 400, 20, 'E-01-01', 'Logística', 'ALMOXARIFADO'),
('TM-024', 'Óculos de Segurança Fumê', 'UN', 200, 10, 'E-01-02', 'Logística', 'ALMOXARIFADO'),
('TM-025', 'Protetor Auricular Plug Silicone', 'UN', 1000, 100, 'E-01-03', 'Logística', 'ALMOXARIFADO'),
('TM-026', 'Caixa de Papelão 50x40x30cm (Embalagem)', 'UN', 1500, 50, 'F-01-01', 'Logística', 'ALMOXARIFADO'),
('TM-027', 'Fita Adesiva Transparente 45mm x 50m', 'RL', 600, 36, 'F-01-02', 'Logística', 'ALMOXARIFADO');

-- 3. Inserindo algumas Sobras Aleatórias no Estoque Alternativo (Para testar o fluxo de caixas abertas)
INSERT INTO `estoque_alternativo` (`itemId`, `quantidade_avulsa`, `setor`, `createdAt`, `updatedAt`) 
SELECT id, 15, 'Montagem', NOW(), NOW() FROM `item` WHERE codigo = 'TM-011'; -- Fechaduras sobrando

INSERT INTO `estoque_alternativo` (`itemId`, `quantidade_avulsa`, `setor`, `createdAt`, `updatedAt`) 
SELECT id, 4, 'Logística', NOW(), NOW() FROM `item` WHERE codigo = 'TM-023'; -- Luvas avulsas

INSERT INTO `estoque_alternativo` (`itemId`, `quantidade_avulsa`, `setor`, `createdAt`, `updatedAt`) 
SELECT id, 22, 'Usinagem', NOW(), NOW() FROM `item` WHERE codigo = 'TM-015'; -- Discos de Corte abertos

-- 4. Criando pedidos de exemplo para não ficar vazio no status
-- Aqui simularemos 2 pedidos do usuário 3 e 4 (como no seed antigo)
-- O usuário 3 é Manutenção e o 4 é Usinagem, mas os IDs podem variar se vc mexeu, 
-- por isso usaremos uma técnica que pega o menor id para simular (assumindo que o ID de um dos Responsáveis existe)
INSERT INTO `pedido` (`userId`, `setor`, `operadorSolicitante`, `status`, `createdAt`) 
SELECT MIN(id), 'Montagem', 'Carlos Silva (Exemplo)', 'AGUARDANDO_SEPARACAO', NOW() FROM `user` WHERE `role` = 'RESPONSAVEL';

INSERT INTO `pedido` (`userId`, `setor`, `operadorSolicitante`, `status`, `createdAt`) 
SELECT MIN(id), 'Usinagem', 'Ana Paula (Exemplo)', 'PRONTO_RETIRADA', DATE_SUB(NOW(), INTERVAL 2 HOUR) FROM `user` WHERE `role` = 'RESPONSAVEL';

-- Inserindo itens nesses pedidos
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `separado`, `qtd_caixas_central`)
SELECT (SELECT MAX(id) - 1 FROM `pedido`), id, 10, 0, 0 FROM `item` WHERE codigo = 'TM-001';

INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `separado`, `qtd_caixas_central`)
SELECT (SELECT MAX(id) FROM `pedido`), id, 2, 0, 0 FROM `item` WHERE codigo = 'TM-015';

-- Fim do Script
