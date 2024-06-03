-- AlterTable
ALTER TABLE `pm_locations` DROP COLUMN `name`;

-- RenameIndex
ALTER TABLE `pm_mutation_logs` RENAME INDEX `ix_user_id` TO `pm_mutation_logs_user_id_fkey`;