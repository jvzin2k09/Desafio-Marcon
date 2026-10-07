-- -----------------------------------------------------
-- Schema Til Marcon Almoxarifado
-- Script de Criação e População Inicial (Seed Atualizado)
-- Sincronizado com prisma/schema.prisma
-- -----------------------------------------------------

CREATE DATABASE IF NOT EXISTS `marcon_almoxarifado` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `marcon_almoxarifado`;

SET FOREIGN_KEY_CHECKS=0;

-- -----------------------------------------------------
-- Table `user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `senha` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL DEFAULT 'RESPONSAVEL', -- 'ADMIN', 'ALMOXARIFE', 'RESPONSAVEL'
  `setor` VARCHAR(191) NULL, -- Ex: 'Usinagem', 'Montagem', 'Manutenção'
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `User_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `item`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `unidade` VARCHAR(20) NOT NULL DEFAULT 'UN', -- UN, KG, CX, PCT
  `quantidade` INT NOT NULL DEFAULT 0,
  `qtd_por_caixa` INT NOT NULL DEFAULT 1,
  `localizacao` VARCHAR(191) NULL,
  `setor` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `armazem` ENUM('ALMOXARIFADO','PRODUCAO','AGUARDANDO_QUALIDADE') NOT NULL DEFAULT 'ALMOXARIFADO',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Item_codigo_key` (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `pedido`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pedido` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL, -- ID do Solicitante
  `setor` VARCHAR(191) NULL,
  `operadorSolicitante` VARCHAR(255) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'AGUARDANDO_SEPARACAO',
  -- Status Kanban: 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'PRONTO_RETIRADA', 'CONCLUIDO', 'ATENDIDO_PARCIALMENTE', 'ESTORNADO'
  `entregueEm` DATETIME(3) NULL,     -- Usado para calcular se foi atendido no SLA de 24h
  `observacao` TEXT NULL,
  `ordem_producao` VARCHAR(100) NULL,
  `centro_custo` VARCHAR(100) NULL,
  `integrado_totvs` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Pedido_userId_fkey` (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `pedidoitem`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `pedidoitem` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pedidoId` INT NOT NULL,
  `itemId` INT NOT NULL,
  `quantidade` INT NOT NULL,
  `quantidadeEnviada` INT NULL,
  `quantidade_separada` INT NULL,
  `separado` TINYINT(1) NOT NULL DEFAULT 0,
  -- Roteamento
  `qtd_alternativo` INT NULL DEFAULT 0,
  `qtd_caixas_central` INT NULL DEFAULT 0,
  `sobra_gerada` INT NULL DEFAULT 0,
  -- Baixa
  `observacao_baixa` TEXT NULL,
  `tipo_baixa` VARCHAR(50) NULL DEFAULT 'QR_CODE',
  `almoxarife_id` INT NULL,
  `data_hora_baixa` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `PedidoItem_itemId_fkey` (`itemId`),
  INDEX `PedidoItem_pedidoId_fkey` (`pedidoId`),
  INDEX `PedidoItem_almoxarifeId_fkey` (`almoxarife_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `estorno` (Histórico Auditável de Devoluções)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `estorno` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pedidoId` INT NOT NULL,
  `itemId` INT NOT NULL,
  `quantidadeEstornada` INT NOT NULL,
  `motivo` VARCHAR(255) NOT NULL,
  `realizadoPorUserId` INT NOT NULL, -- Almoxarife que fez o estorno
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `Estorno_itemId_fkey` (`itemId`),
  INDEX `Estorno_pedidoId_fkey` (`pedidoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `estoque_alternativo`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `estoque_alternativo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `itemId` INT NOT NULL,
  `quantidade_avulsa` INT NOT NULL DEFAULT 0,
  `setor` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `estoque_alternativo_itemId_setor_key` (`itemId`, `setor`),
  INDEX `EstoqueAlternativo_itemId_fkey` (`itemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Chaves Estrangeiras (Relationships)
-- -----------------------------------------------------
ALTER TABLE `pedido` ADD CONSTRAINT `Pedido_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pedidoitem` ADD CONSTRAINT `PedidoItem_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pedidoitem` ADD CONSTRAINT `PedidoItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pedidoitem` ADD CONSTRAINT `PedidoItem_almoxarifeId_fkey` FOREIGN KEY (`almoxarife_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `estorno` ADD CONSTRAINT `Estorno_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `estorno` ADD CONSTRAINT `Estorno_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `estoque_alternativo` ADD CONSTRAINT `EstoqueAlternativo_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;

-- -----------------------------------------------------
-- DADOS INICIAIS (SEED COMPLETO - DEMO PITCH MARCON / WINE)
-- -----------------------------------------------------

-- Limpeza prévia com integridade
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `estorno`;
TRUNCATE TABLE `pedidoitem`;
TRUNCATE TABLE `pedido`;
TRUNCATE TABLE `estoque_alternativo`;
TRUNCATE TABLE `item`;
TRUNCATE TABLE `user`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Usuários e Operadores Fabris
INSERT INTO `user` (`id`, `nome`, `email`, `senha`, `role`, `setor`) VALUES
(1, 'Administrador Marcon', 'admin@tilmarcon.com.br', '123456', 'ADMIN', 'TI'),
(2, 'Almoxarife Til Marcon', 'almoxarife@tilmarcon.com.br', '123456', 'ALMOXARIFE', 'Almoxarifado'),
(3, 'Caio César Dutra', 'caio.dutra@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Usinagem'),
(4, 'João Guilherme Martins', 'joao.martins@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Manutenção'),
(5, 'Ana Caroline Rombi', 'ana.rombi@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Montagem'),
(6, 'João Victor Ramos', 'joao.ramos@tilmarcon.com.br', '123456', 'ALMOXARIFE', 'Almoxarifado'),
(7, 'Luis Gustavo Reis', 'luis.reis@tilmarcon.com.br', '123456', 'ALMOXARIFE', 'Almoxarifado'),
(8, 'Lucas Alcantara', 'lucas.alcantara@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Usinagem'),
(9, 'Mariana Fernandes', 'mariana.fernandes@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Usinagem'),
(10, 'Roberto Santos', 'roberto.santos@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Montagem'),
(11, 'Responsável 1 (Manutenção)', 'responsavel1@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Manutenção'),
(12, 'Responsável 2 (Usinagem)', 'responsavel2@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Usinagem');

-- 2. Itens Industriais (13 itens com Nível Seguro, Estoque Baixo e Esgotado)
INSERT INTO `item` (`id`, `codigo`, `nome`, `unidade`, `quantidade`, `qtd_por_caixa`, `localizacao`, `setor`, `armazem`) VALUES
(1, 'TM-001', 'Parafuso Sextavado M8x20mm', 'UN', 450, 100, 'A-01-01', 'Usinagem', 'ALMOXARIFADO'),
(2, 'TM-002', 'Porca Sextavada M8', 'UN', 900, 200, 'A-01-02', 'Usinagem', 'ALMOXARIFADO'),
(3, 'TM-003', 'Arruela Lisa M8 Zinco', 'UN', 800, 200, 'A-01-03', 'Usinagem', 'ALMOXARIFADO'),
(4, 'TM-004', 'Chapa de Aço Carbono 2mm 1x2m', 'UN', 3, 1, 'B-02-01', 'Usinagem', 'ALMOXARIFADO'),
(5, 'TM-005', 'Tubo Redondo 1 Polegada x 6m', 'UN', 35, 1, 'B-02-02', 'Usinagem', 'ALMOXARIFADO'),
(6, 'TM-006', 'Fita Crepe Industrial 50mm', 'UN', 85, 12, 'C-01-01', 'Montagem', 'ALMOXARIFADO'),
(7, 'TM-007', 'Luvas Nitrílicas de Proteção CA 123 P', 'PAR', 120, 10, 'EPI-01', 'Montagem', 'ALMOXARIFADO'),
(8, 'TM-008', 'Óculos de Segurança Fumê', 'UN', 65, 10, 'EPI-02', 'Usinagem', 'ALMOXARIFADO'),
(9, 'TM-009', 'Eletrodo Revestido AWS E6013 2.5mm', 'KG', 400, 20, 'C-02-01', 'Manutenção', 'ALMOXARIFADO'),
(10, 'TM-010', 'Disco de Corte Inox 4.1/2"', 'UN', 180, 25, 'C-02-02', 'Manutenção', 'ALMOXARIFADO'),
(11, 'TM-011', 'Caixa de Papelão 50x40x30cm', 'UN', 320, 50, 'D-01-01', 'Logística', 'ALMOXARIFADO'),
(13, 'TM-013', 'Broca de Aço Rápido HSS 10.0mm', 'UN', 0, 10, 'A-02-04', 'Usinagem', 'ALMOXARIFADO'),
(14, 'TM-014', 'Disco Flap Abrasivo 4.1/2" Grão 60', 'UN', 4, 10, 'C-02-03', 'Manutenção', 'ALMOXARIFADO'),
(15, 'TM-015', 'Fluido de Corte Solúvel para Usinagem 5L', 'GL', 2, 1, 'B-03-01', 'Usinagem', 'ALMOXARIFADO');

-- 3. Estoque Alternativo (Sobras Reutilizáveis)
INSERT INTO `estoque_alternativo` (`itemId`, `setor`, `quantidade_avulsa`) VALUES
(1, 'Usinagem', 30),
(2, 'Usinagem', 50),
(3, 'Usinagem', 40),
(5, 'Usinagem', 2),
(6, 'Montagem', 5),
(7, 'Montagem', 4),
(8, 'Usinagem', 6),
(9, 'Manutenção', 8),
(10, 'Manutenção', 12),
(11, 'Logística', 15),
(12, 'Logística', 3),
(14, 'Manutenção', 1);

-- 4. Histórico de Pedidos Concluídos (#0010 a #0016 - ENTREGUE)
INSERT INTO `pedido` (`id`, `userId`, `setor`, `operadorSolicitante`, `status`, `ordem_producao`, `centro_custo`, `observacao`, `createdAt`, `entregueEm`) VALUES
(10, 3, 'Usinagem', 'Caio César Dutra', 'ENTREGUE', 'OP-4310', 'CC-3100', 'Atendimento prioritário para torno CNC #03', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
(11, 5, 'Montagem', 'Ana Caroline Rombi', 'ENTREGUE', 'OP-4315', 'CC-4120', 'Linha de montagem de gabinetes', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 210 MINUTE)),
(12, 4, 'Manutenção', 'João Guilherme Martins', 'ENTREGUE', 'OP-4322', 'CC-2200', 'Manutenção preventiva na fresadora F-02', DATE_SUB(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 23 HOUR)),
(13, 8, 'Usinagem', 'Lucas Alcantara', 'ENTREGUE', 'OP-4328', 'CC-1050', 'Fabricação de estrutura metálica padrão', DATE_SUB(NOW(), INTERVAL 28 HOUR), DATE_SUB(NOW(), INTERVAL 27 HOUR)),
(14, 9, 'Usinagem', 'Mariana Fernandes', 'ENTREGUE', 'OP-4334', 'CC-3100', 'Fixação dos blocos hidráulicos', DATE_SUB(NOW(), INTERVAL 48 HOUR), DATE_SUB(NOW(), INTERVAL 47 HOUR)),
(15, 10, 'Montagem', 'Roberto Santos', 'ENTREGUE', 'OP-4340', 'CC-4120', 'Troca periódica de EPIs da equipe', DATE_SUB(NOW(), INTERVAL 72 HOUR), DATE_SUB(NOW(), INTERVAL 70 HOUR)),
(16, 1, 'Logística', 'Claudio Mendes', 'ENTREGUE', 'OP-4355', 'CC-5010', 'Embalagem de lote para expedição', DATE_SUB(NOW(), INTERVAL 96 HOUR), DATE_SUB(NOW(), INTERVAL 94 HOUR));

-- Itens do Histórico
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `quantidade_separada`, `separado`, `qtd_caixas_central`, `tipo_baixa`, `almoxarife_id`, `data_hora_baixa`, `observacao_baixa`) VALUES
(10, 1, 200, 200, 200, 1, 2, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 100 MINUTE), 'Conferido 100%'),
(10, 2, 200, 200, 200, 1, 1, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 100 MINUTE), 'Conferido 100%'),
(11, 6, 24, 24, 24, 1, 2, 'QR_CODE', 7, DATE_SUB(NOW(), INTERVAL 210 MINUTE), '2 caixas lacradas'),
(12, 10, 15, 15, 15, 1, 1, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 23 HOUR), 'Discos conferidos'),
(12, 7, 4, 4, 4, 1, 1, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 23 HOUR), 'EPIs liberados'),
(13, 5, 4, 4, 4, 1, 4, 'QR_CODE', 2, DATE_SUB(NOW(), INTERVAL 27 HOUR), 'Tubos retirados no pátio B'),
(14, 2, 300, 300, 300, 1, 2, 'QR_CODE', 7, DATE_SUB(NOW(), INTERVAL 47 HOUR), 'Conferido'),
(14, 3, 300, 300, 300, 1, 2, 'QR_CODE', 7, DATE_SUB(NOW(), INTERVAL 47 HOUR), 'Conferido'),
(15, 8, 20, 20, 20, 1, 2, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 70 HOUR), 'EPIs novos entregues'),
(16, 11, 50, 50, 50, 1, 1, 'QR_CODE', 2, DATE_SUB(NOW(), INTERVAL 94 HOUR), 'Fardo de caixas entregue'),
(16, 12, 12, 12, 12, 1, 1, 'QR_CODE', 2, DATE_SUB(NOW(), INTERVAL 94 HOUR), '1 pacote de fitas');

-- 5. Requisições Ativas do Kanban (#0017 a #0026)
INSERT INTO `pedido` (`id`, `userId`, `setor`, `operadorSolicitante`, `status`, `ordem_producao`, `centro_custo`, `observacao`, `createdAt`) VALUES
-- AGUARDANDO_SEPARACAO
(17, 1, 'Usinagem', 'Caio César Dutra', 'AGUARDANDO_SEPARACAO', 'OP-4412', 'CC-3100', 'Urgente para finalização do lote de eixos usinados', DATE_SUB(NOW(), INTERVAL 1 MINUTE)),
(18, 1, 'Manutenção', 'João Guilherme Martins', 'AGUARDANDO_SEPARACAO', 'OP-4415', 'CC-2200', 'Troca de discos do esmeril industrial', DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
(19, 1, 'Usinagem', 'Caio César Dutra', 'AGUARDANDO_SEPARACAO', 'OP-4418', 'CC-1050', 'Soldagem e reforço da estrutura de apoio', DATE_SUB(NOW(), INTERVAL 4 MINUTE)),
(25, 1, 'Manutenção', 'Caio César Dutra', 'AGUARDANDO_SEPARACAO', 'OP-4425', 'CC-2200', 'Troca de fiação e soldagem do painel elétrico B', DATE_SUB(NOW(), INTERVAL 1 MINUTE)),

-- EM_SEPARACAO
(20, 1, 'Usinagem', 'Mariana Fernandes', 'EM_SEPARACAO', 'OP-4390', 'CC-3100', 'Montagem das buchas guia de precisão', DATE_SUB(NOW(), INTERVAL 3 MINUTE)),
(21, 1, 'Montagem', 'Roberto Santos', 'EM_SEPARACAO', 'OP-4395', 'CC-4120', 'Isolamento de pintura e proteção de componentes', DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
(22, 1, 'Logística', 'João Guilherme Martins', 'EM_SEPARACAO', 'OP-4402', 'CC-5010', 'Fechamento de caixas do turno matutino', DATE_SUB(NOW(), INTERVAL 8 MINUTE)),
(26, 1, 'Montagem', 'Ana Caroline Rombi', 'EM_SEPARACAO', 'OP-4430', 'CC-4120', 'Almoxarife em conferência final de caixas', DATE_SUB(NOW(), INTERVAL 6 MINUTE)),

-- PRONTO_RETIRADA
(23, 1, 'Montagem', 'Ana Caroline Rombi', 'PRONTO_RETIRADA', 'OP-4375', 'CC-4120', 'Aguardando operador na bancada do Almoxarifado Central', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
(24, 1, 'Usinagem', 'Lucas Alcantara', 'PRONTO_RETIRADA', 'OP-4380', 'CC-3100', 'Separado e pronto para transporte até a Usinagem', DATE_SUB(NOW(), INTERVAL 35 MINUTE));

-- Itens das Requisições Ativas
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `quantidade_separada`, `separado`, `qtd_caixas_central`, `tipo_baixa`, `almoxarife_id`, `data_hora_baixa`, `observacao_baixa`) VALUES
-- Pedido 17 (Aguardando)
(17, 1, 50, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
(17, 2, 50, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
-- Pedido 18 (Aguardando)
(18, 10, 5, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
(18, 7, 2, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
-- Pedido 19 (Aguardando)
(19, 5, 2, NULL, NULL, 0, 2, 'QR_CODE', NULL, NULL, NULL),
(19, 9, 10, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
-- Pedido 25 (Aguardando)
(25, 9, 5, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),
(25, 6, 3, NULL, NULL, 0, 1, 'QR_CODE', NULL, NULL, NULL),

-- Pedido 20 (Em Separação)
(20, 3, 100, NULL, NULL, 0, 1, 'QR_CODE', 6, NULL, NULL),
(20, 8, 2, NULL, NULL, 0, 1, 'QR_CODE', 6, NULL, NULL),
-- Pedido 21 (Em Separação)
(21, 6, 12, NULL, NULL, 0, 1, 'QR_CODE', 7, NULL, NULL),
(21, 7, 6, NULL, NULL, 0, 1, 'QR_CODE', 7, NULL, NULL),
-- Pedido 22 (Em Separação)
(22, 11, 20, NULL, NULL, 0, 1, 'QR_CODE', 6, NULL, NULL),
(22, 12, 4, NULL, NULL, 0, 1, 'QR_CODE', 6, NULL, NULL),
-- Pedido 26 (Em Separação)
(26, 7, 10, NULL, NULL, 0, 1, 'QR_CODE', 7, NULL, NULL),
(26, 12, 6, NULL, NULL, 0, 1, 'QR_CODE', 7, NULL, NULL),

-- Pedido 23 (Pronto Retirada - com baixa confirmada pronta para entrega)
(23, 8, 4, 4, 4, 1, 1, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 'Conferido com leitor QR'),
(23, 7, 8, 8, 8, 1, 1, 'QR_CODE', 6, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 'Conferido com leitor QR'),
-- Pedido 24 (Pronto Retirada - com baixa confirmada pronta para entrega)
(24, 1, 100, 100, 100, 1, 1, 'QR_CODE', 7, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'Separado 1 caixa fechada'),
(24, 2, 100, 100, 100, 1, 1, 'QR_CODE', 7, DATE_SUB(NOW(), INTERVAL 10 MINUTE), 'Separado 1 pacote conferido');