-- AlterTable: Add serviceType column to scheduled_attendances
ALTER TABLE `scheduled_attendances` ADD COLUMN `serviceType` ENUM('ASSISTENCIA_SOCIAL', 'ADVOCACIA', 'PSICOLOGIA', 'NUTRICAO', 'FISIOTERAPIA', 'AURICULOTERAPIA', 'TERAPIA_GRUPO', 'SALAO_BELEZA', 'ATIVIDADE_FISICA', 'ATIVIDADE_COLETIVA', 'DEFESA_PESSOAL', 'CAIMO', 'OUTRO') NULL;

-- CreateIndex
CREATE INDEX `scheduled_attendances_serviceType_idx` ON `scheduled_attendances`(`serviceType`);
