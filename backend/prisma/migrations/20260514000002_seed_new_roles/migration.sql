-- Inserir os novos roles na tabela roles (se ainda não existirem)
INSERT IGNORE INTO `roles` (`id`, `name`, `createdAt`)
VALUES 
  (UUID(), 'GUARD', NOW()),
  (UUID(), 'PSYCHOLOGIST', NOW());
