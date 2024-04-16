-- AlterTable
ALTER TABLE `pm_promises` ADD COLUMN `is_latest_destination` BOOLEAN NOT NULL DEFAULT false AFTER `destination_id`;

-- UpdateTable
UPDATE `pm_promises` SET `is_latest_destination` = true WHERE `destination_id` IS NOT NULL;
