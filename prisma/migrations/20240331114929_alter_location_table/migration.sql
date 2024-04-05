/*
  Warnings:

  - Made the column `city` on table `pm_locations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `district` on table `pm_locations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `pm_locations` MODIFY `city` VARCHAR(50) NOT NULL,
    MODIFY `district` VARCHAR(50) NOT NULL;
