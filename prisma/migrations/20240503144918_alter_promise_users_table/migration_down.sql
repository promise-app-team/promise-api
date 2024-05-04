-- AlterTable
ALTER TABLE `pm_promise_users`
  RENAME COLUMN `attended_at` TO `created_at`,
  DROP COLUMN `is_midpoint_calculated`,
  DROP COLUMN `leaved_at`,
  ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL;

UPDATE `pm_promise_users` SET `updated_at` = `created_at`;
