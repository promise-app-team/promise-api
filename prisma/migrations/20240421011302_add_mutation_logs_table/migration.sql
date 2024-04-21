-- CreateTable
CREATE TABLE `pm_mutation_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `method` VARCHAR(8) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `agent` VARCHAR(255) NULL,
    `body` JSON NULL,
    `status_code` INTEGER UNSIGNED NOT NULL,
    `response` JSON NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pm_mutation_logs` ADD CONSTRAINT `pm_mutation_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `pm_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
