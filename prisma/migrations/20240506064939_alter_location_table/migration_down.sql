-- AlterTable
-- ALTER TABLE `pm_locations` DROP COLUMN `address1`,
--     DROP COLUMN `address2`,
--     ADD COLUMN `address` VARCHAR(100) NULL,
--     MODIFY `city` varchar(50) NOT NULL,
--     MODIFY `district` varchar(50) NOT NULL;

-- CreateIndex
-- CREATE INDEX `pm_mutation_logs_user_id_fkey` ON `pm_mutation_logs`(`user_id` ASC);

ALTER TABLE `pm_locations`
  MODIFY `city` VARCHAR(50) NOT NULL,
  MODIFY `district` VARCHAR(50) NOT NULL,
  DROP COLUMN `address2`,
  CHANGE `address1` `address` VARCHAR(100) NULL;
