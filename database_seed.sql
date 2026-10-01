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
-- DADOS INICIAIS (SEED)
-- -----------------------------------------------------

-- Usuários (Senha padrão 123456, primeiro acesso para responsaveis)
INSERT INTO `user` (`nome`, `email`, `senha`, `role`, `setor`) VALUES
('Administrador', 'admin@tilmarcon.com.br', '123456', 'ADMIN', 'TI'),
('Almoxarife Til Marcon', 'almoxarife@tilmarcon.com.br', '123456', 'ALMOXARIFE', 'Almoxarifado'),
('Responsável 1', 'responsavel1@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Manutenção'),
('Responsável 2', 'responsavel2@tilmarcon.com.br', '123456', 'RESPONSAVEL', 'Usinagem');

-- Itens de Estoque
INSERT INTO `item` (`codigo`, `nome`, `unidade`, `quantidade`, `qtd_por_caixa`, `localizacao`) VALUES
('TM-001', 'Parafuso Sextavado M8x20mm', 'UN', 500, 100, 'A-01-01'),
('TM-002', 'Porca Sextavada M8', 'UN', 1000, 200, 'A-01-02'),
('TM-003', 'Arruela Lisa M8 Zinco', 'UN', 1000, 200, 'A-01-03'),
('TM-004', 'Chapa de Aço Carbono 2mm 1x2m', 'UN', 50, 1, 'B-02-01'),
('TM-005', 'Tubo Redondo 1 Polegada x 6m', 'UN', 30, 1, 'B-02-02'),
('TM-006', 'Fita Crepe Industrial 50mm', 'UN', 200, 12, 'C-01-01'),
('TM-007', 'Luva de Proteção CA 123 P', 'PAR', 150, 10, 'EPI-01'),
('TM-008', 'Óculos de Segurança Fumê', 'UN', 80, 10, 'EPI-02'),
('TM-009', 'Eletrodo Revestido AWS E6013 2.5mm', 'KG', 1500, 20, 'C-02-01'),
('TM-010', 'Disco de Corte Inox 4.1/2"', 'UN', 300, 25, 'C-02-02'),
('TM-011', 'Caixa de Papelão 50x40x30cm', 'UN', 500, 50, 'D-01-01'),
('TM-012', 'Fita Adesiva Transparente 45mm x 50m', 'ROLO', 150, 12, 'D-01-02');

-- Pedidos com os novos status do Kanban
INSERT INTO `pedido` (`userId`, `setor`, `operadorSolicitante`, `status`, `createdAt`, `entregueEm`) VALUES
(3, 'Manutenção', 'João Silva', 'AGUARDANDO_SEPARACAO', NOW(), NULL), -- Pedido 1
(4, 'Usinagem', 'Carlos Souza', 'EM_SEPARACAO', DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL), -- Pedido 2
(3, 'Manutenção', 'João Silva', 'PRONTO_RETIRADA', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL), -- Pedido 3
(4, 'Usinagem', 'Carlos Souza', 'CONCLUIDO', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 HOUR)), -- Pedido 4
(3, 'Manutenção', 'Maria Oliveira', 'AGUARDANDO_SEPARACAO', DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL); -- Pedido 5

-- Itens do Pedido 1 (Aguardando Separação)
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(1, 1, 100, NULL, false),
(1, 2, 100, NULL, false),
(1, 3, 100, NULL, false);

-- Itens do Pedido 2 (Em Separação)
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(2, 9, 50, 50, false),
(2, 10, 15, 10, false);

-- Itens do Pedido 3 (Pronto para Retirada)
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(3, 4, 5, 5, true),
(3, 5, 2, 2, true),
(3, 6, 10, 10, true);

-- Itens do Pedido 4 (Concluído)
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(4, 7, 2, 2, true),
(4, 8, 2, 2, true);

-- Itens do Pedido 5 (Aguardando Separação)
INSERT INTO `pedidoitem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(5, 7, 5, NULL, false);