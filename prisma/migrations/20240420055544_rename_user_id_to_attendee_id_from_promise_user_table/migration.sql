/*
  Warnings:

  - The primary key for the `pm_promise_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `user_id` on the `pm_promise_users` table. All the data in the column will be lost.
  - Added the required column `attendee_id` to the `pm_promise_users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `pm_promise_users` DROP FOREIGN KEY `pm_promise_users_user_id_fkey`;

-- AlterTable
ALTER TABLE `pm_promise_users` RENAME COLUMN `user_id` TO `attendee_id`;
ALTER TABLE `pm_promise_users` MODIFY COLUMN `attendee_id` INTEGER UNSIGNED NOT NULL AFTER `promise_id`;

-- CreateIndex
CREATE INDEX `ix_attendee_id` ON `pm_promise_users`(`attendee_id`);
DROP INDEX `ix_user_id` ON `pm_promise_users`;

-- AddForeignKey
ALTER TABLE `pm_promise_users` ADD CONSTRAINT `pm_promise_users_attendee_id_fkey` FOREIGN KEY (`attendee_id`) REFERENCES `pm_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
