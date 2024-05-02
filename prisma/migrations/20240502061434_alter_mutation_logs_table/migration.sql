-- AlterTable
ALTER TABLE `pm_mutation_logs`
  DROP COLUMN `request_at`,
  ADD COLUMN `duration` INT UNSIGNED NOT NULL AFTER `response_body`,
  CHANGE `response_at` `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);
