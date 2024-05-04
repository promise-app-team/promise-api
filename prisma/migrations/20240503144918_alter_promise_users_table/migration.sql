-- AlterTable
ALTER TABLE `pm_promise_users`
  RENAME COLUMN `created_at` TO `attended_at`,
  ADD COLUMN `is_midpoint_calculated` BOOLEAN NOT NULL DEFAULT false AFTER `start_location_id`,
  ADD COLUMN `leaved_at` TIMESTAMP(0) NULL,
  DROP COLUMN `updated_at`;
