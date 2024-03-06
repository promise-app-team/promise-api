-- CreateTable
CREATE TABLE `pm_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(80) NULL,
    `profile_url` TEXT NULL,
    `provider` ENUM('KAKAO', 'GOOGLE', 'APPLE') NOT NULL,
    `provider_id` VARCHAR(100) NULL,
    `last_signed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,
    `leave_reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `pm_users_provider_provider_id_key`(`provider`, `provider_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_promises` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `host_id` INTEGER UNSIGNED NOT NULL,
    `title` VARCHAR(50) NOT NULL,
    `destination_type` ENUM('STATIC', 'DYNAMIC') NOT NULL,
    `destination_id` INTEGER UNSIGNED NULL,
    `location_share_start_type` ENUM('DISTANCE', 'TIME') NOT NULL,
    `location_share_start_value` INTEGER UNSIGNED NOT NULL,
    `location_share_end_type` ENUM('DISTANCE', 'TIME') NOT NULL,
    `location_share_end_value` INTEGER UNSIGNED NOT NULL,
    `promised_at` TIMESTAMP(0) NOT NULL,
    `completed_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_promise_users` (
    `user_id` INTEGER UNSIGNED NOT NULL,
    `promise_id` INTEGER UNSIGNED NOT NULL,
    `start_location_id` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `pm_promise_users_start_location_id_key`(`start_location_id`),
    PRIMARY KEY (`promise_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_themes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(10) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_promise_themes` (
    `promise_id` INTEGER UNSIGNED NOT NULL,
    `theme_id` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`promise_id`, `theme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm_locations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `city` VARCHAR(50) NULL,
    `district` VARCHAR(50) NULL,
    `address` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pm_promises` ADD CONSTRAINT `pm_promises_host_id_fkey` FOREIGN KEY (`host_id`) REFERENCES `pm_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promises` ADD CONSTRAINT `pm_promises_destination_id_fkey` FOREIGN KEY (`destination_id`) REFERENCES `pm_locations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promise_users` ADD CONSTRAINT `pm_promise_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `pm_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promise_users` ADD CONSTRAINT `pm_promise_users_promise_id_fkey` FOREIGN KEY (`promise_id`) REFERENCES `pm_promises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promise_users` ADD CONSTRAINT `pm_promise_users_start_location_id_fkey` FOREIGN KEY (`start_location_id`) REFERENCES `pm_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promise_themes` ADD CONSTRAINT `pm_promise_themes_promise_id_fkey` FOREIGN KEY (`promise_id`) REFERENCES `pm_promises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm_promise_themes` ADD CONSTRAINT `pm_promise_themes_theme_id_fkey` FOREIGN KEY (`theme_id`) REFERENCES `pm_themes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
