-- AlterTable
ALTER TABLE `support_services` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `support_services_isActive_idx` ON `support_services`(`isActive`);
