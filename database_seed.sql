-- -----------------------------------------------------
-- Schema Til Marcon Almoxarifado
-- Script de Criação e População Inicial (Seed Atualizado)
-- -----------------------------------------------------

CREATE DATABASE IF NOT EXISTS `marcon_almoxarifado` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `marcon_almoxarifado`;

SET FOREIGN_KEY_CHECKS=0;

-- -----------------------------------------------------
-- Table `User`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `senha` VARCHAR(191) NOT NULL,
  `pin` VARCHAR(191) NULL, -- Guarda o PIN numérico de 4 dígitos (hash ou texto)
  `role` VARCHAR(191) NOT NULL DEFAULT 'OPERADOR', -- 'ADMIN', 'ALMOXARIFE', 'OPERADOR'
  `setor` VARCHAR(191) NULL, -- Ex: 'Usinagem', 'Montagem', 'Manutenção'
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `User_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `Item`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(191) NOT NULL,
  `unidade` VARCHAR(20) NOT NULL DEFAULT 'UN', -- UN, KG, CX, PCT
  `quantidade` INT NOT NULL DEFAULT 0,
  `localizacao` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Item_codigo_key` (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `Pedido`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Pedido` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL, -- ID do Solicitante
  `setor` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'AGUARDANDO_SEPARACAO', 
  -- Status Kanban: 'AGUARDANDO_SEPARACAO', 'EM_SEPARACAO', 'PRONTO_RETIRADA', 'CONCLUIDO', 'ESTORNADO'
  `pinValidadoEm` DATETIME(3) NULL, -- Data/hora em que o PIN foi digitado no balcão
  `entregueEm` DATETIME(3) NULL,     -- Usado para calcular se foi atendido no SLA de 24h
  `observacao` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `PedidoItem`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `PedidoItem` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pedidoId` INT NOT NULL,
  `itemId` INT NOT NULL,
  `quantidade` INT NOT NULL,
  `quantidadeEnviada` INT NULL,
  `separado` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `Estorno` (Histórico Auditável de Devoluções)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `Estorno` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pedidoId` INT NOT NULL,
  `itemId` INT NOT NULL,
  `quantidadeEstornada` INT NOT NULL,
  `motivo` VARCHAR(255) NOT NULL,
  `realizadoPorUserId` INT NOT NULL, -- Almoxarife que fez o estorno
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Chaves Estrangeiras (Relationships)
-- -----------------------------------------------------
ALTER TABLE `Pedido` ADD CONSTRAINT `Pedido_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Estorno` ADD CONSTRAINT `Estorno_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Estorno` ADD CONSTRAINT `Estorno_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;

-- -----------------------------------------------------
-- DADOS INICIAIS (SEED)
-- -----------------------------------------------------

-- Usuários (Senha padrão 123456 | PIN padrão 1234)
INSERT INTO `User` (`nome`, `email`, `senha`, `pin`, `role`, `setor`) VALUES
('Almoxarife Til Marcon', 'almoxarife@tilmarcon.com.br', '123456', '0000', 'ALMOXARIFE', 'Almoxarifado'),
('Almoxarife Til Marcon', 'admin@tilmarcon.com.br', '123456', '0000', 'ALMOXARIFE', 'Almoxarifado'),
('Lucas Engenharia', 'lucas@tilmarcon.com.br', '123456', '1234', 'OPERADOR', 'Manutenção'),
('Operador Logística', 'op1@tilmarcon.com.br', '123456', '5678', 'OPERADOR', 'Usinagem');

-- Itens de Estoque
INSERT INTO `Item` (`codigo`, `nome`, `unidade`, `quantidade`, `localizacao`) VALUES
('TM-001', 'Parafuso Sextavado M8x20mm', 'UN', 500, 'A-01-01'),
('TM-002', 'Porca Sextavada M8', 'UN', 1000, 'A-01-02'),
('TM-003', 'Arruela Lisa M8 Zinco', 'UN', 1000, 'A-01-03'),
('TM-004', 'Chapa de Aço Carbono 2mm 1x2m', 'UN', 50, 'B-02-01'),
('TM-005', 'Tubo Redondo 1 Polegada x 6m', 'UN', 30, 'B-02-02'),
('TM-006', 'Fita Crepe Industrial 50mm', 'UN', 200, 'C-01-01'),
('TM-007', 'Luva de Proteção CA 123 P', 'PAR', 150, 'EPI-01'),
('TM-008', 'Óculos de Segurança Fumê', 'UN', 80, 'EPI-02'),
('TM-009', 'Eletrodo Revestido AWS E6013 2.5mm', 'KG', 1500, 'C-02-01'),
('TM-010', 'Disco de Corte Inox 4.1/2"', 'UN', 300, 'C-02-02');

-- Pedidos com os novos status do Kanban
INSERT INTO `Pedido` (`userId`, `setor`, `status`, `createdAt`, `pinValidadoEm`, `entregueEm`) VALUES
(2, 'Manutenção', 'AGUARDANDO_SEPARACAO', NOW(), NULL, NULL), -- Pedido 1
(3, 'Usinagem', 'EM_SEPARACAO', DATE_SUB(NOW(), INTERVAL 30 MINUTE), NULL, NULL), -- Pedido 2
(2, 'Manutenção', 'PRONTO_RETIRADA', DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL, NULL), -- Pedido 3 (Aguardando o solicitante ir ao balcão digitar o PIN)
(3, 'Usinagem', 'CONCLUIDO', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR)), -- Pedido 4 (Entregue com PIN digitado)
(2, 'Manutenção', 'AGUARDANDO_SEPARACAO', DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, NULL); -- Pedido 5

-- Itens do Pedido 1 (Aguardando Separação)
INSERT INTO `PedidoItem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(1, 1, 100, NULL, false),
(1, 2, 100, NULL, false),
(1, 3, 100, NULL, false);

-- Itens do Pedido 2 (Em Separação)
INSERT INTO `PedidoItem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(2, 9, 50, 50, false),
(2, 10, 15, 10, false);

-- Itens do Pedido 3 (Pronto para Retirada)
INSERT INTO `PedidoItem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(3, 4, 5, 5, true),
(3, 5, 2, 2, true),
(3, 6, 10, 10, true);

-- Itens do Pedido 4 (Concluído)
INSERT INTO `PedidoItem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(4, 7, 2, 2, true),
(4, 8, 2, 2, true);

-- Itens do Pedido 5 (Aguardando Separação)
INSERT INTO `PedidoItem` (`pedidoId`, `itemId`, `quantidade`, `quantidadeEnviada`, `separado`) VALUES
(5, 7, 5, NULL, false);