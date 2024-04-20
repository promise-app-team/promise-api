-- DropForeignKey
ALTER TABLE `pm_promise_users` DROP FOREIGN KEY `pm_promise_users_attendee_id_fkey`;

-- AlterTable
ALTER TABLE `pm_promise_users` RENAME COLUMN `attendee_id` TO `user_id`;

-- CreateIndex
CREATE INDEX `ix_user_id` ON `pm_promise_users`(`user_id` ASC);
DROP INDEX `ix_attendee_id` ON `pm_promise_users`;

-- AddForeignKey
ALTER TABLE `pm_promise_users` ADD CONSTRAINT `pm_promise_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `pm_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


