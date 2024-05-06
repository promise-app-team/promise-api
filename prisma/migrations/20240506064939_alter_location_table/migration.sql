-- AlterTable
-- ALTER TABLE `pm_locations` DROP COLUMN `address`,
--     ADD COLUMN `address1` VARCHAR(20) NOT NULL,
--     ADD COLUMN `address2` VARCHAR(50) NULL,
--     MODIFY `city` VARCHAR(10) NOT NULL,
--     MODIFY `district` VARCHAR(5) NOT NULL;

ALTER TABLE `pm_locations`
  MODIFY `city` VARCHAR(10) NOT NULL,
  MODIFY `district` VARCHAR(5) NOT NULL,
  CHANGE `address` `address1` VARCHAR(20) NOT NULL,
  ADD COLUMN `address2` VARCHAR(50) NULL AFTER `address1`;
