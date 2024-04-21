-- CreateTable
CREATE TABLE `pm_mutation_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `method` VARCHAR(8) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `headers` JSON NULL,
    `status_code` SMALLINT UNSIGNED NOT NULL,
    `request_body` JSON NULL,
    `response_body` JSON NULL,
    `request_at` TIMESTAMP(0) NOT NULL,
    `response_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pm_mutation_logs` ADD CONSTRAINT `pm_mutation_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `pm_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
