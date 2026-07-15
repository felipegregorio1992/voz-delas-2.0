-- Criar conta admin geral (source = WEB, role = ADMIN)
-- Senha: Admin@VozDelas2026

-- Garantir que o role ADMIN existe
INSERT IGNORE INTO `roles` (`id`, `name`, `createdAt`)
VALUES (UUID(), 'ADMIN', NOW());

-- Criar o usuário admin (upsert via INSERT IGNORE + UPDATE)
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@vozdelas.com' LIMIT 1);

INSERT INTO `users` (`id`, `name`, `email`, `passwordHash`, `isActive`, `source`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Administrador Geral', 'admin@vozdelas.com',
       '$2b$12$HQqbbsaZJ7G.ydc5xWD.1.pDuwR2O1ivlWQCnvVewtffaLlC58Oq2',
       1, 'WEB', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@vozdelas.com');

-- Atualizar source caso o admin já exista com source = APP
UPDATE `users` SET `source` = 'WEB' WHERE `email` = 'admin@vozdelas.com';

-- Atribuir role ADMIN ao usuário
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@vozdelas.com' LIMIT 1);
SET @admin_role_id = (SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1);

INSERT IGNORE INTO `user_roles` (`userId`, `roleId`, `createdAt`)
VALUES (@admin_id, @admin_role_id, NOW());
