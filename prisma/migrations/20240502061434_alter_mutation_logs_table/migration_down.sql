-- AlterTable
ALTER TABLE `pm_mutation_logs`
  DROP COLUMN `duration`,
  ADD `request_at` TIMESTAMP(0) NOT NULL AFTER `response_body`,
  CHANGE `created_at` `response_at` TIMESTAMP(0) NOT NULL;

UPDATE `pm_mutation_logs` SET `request_at` = `response_at`;


