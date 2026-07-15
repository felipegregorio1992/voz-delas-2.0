-- Add UserSource enum and source column to users table
ALTER TABLE `users` ADD COLUMN `source` ENUM('APP', 'WEB') NOT NULL DEFAULT 'APP';
