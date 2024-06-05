-- AlterTable
ALTER TABLE `pm_locations` ADD COLUMN `name` VARCHAR(20) NULL DEFAULT NULL AFTER `id`;

-- RenameIndex
ALTER TABLE `pm_mutation_logs` RENAME INDEX `pm_mutation_logs_user_id_fkey` TO `ix_user_id`;


