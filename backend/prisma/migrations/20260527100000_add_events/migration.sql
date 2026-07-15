-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('COURSE', 'WORKSHOP', 'PHYSICAL_ACTIVITY', 'CULTURAL', 'HEALTH', 'ENTREPRENEURSHIP', 'OTHER') NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PUBLISHED',
    `location` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `maxSlots` INTEGER NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `recurringDays` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `program` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `events_category_idx`(`category`),
    INDEX `events_status_idx`(`status`),
    INDEX `events_startDate_idx`(`startDate`),
    INDEX `events_sector_idx`(`sector`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('CONFIRMED', 'CANCELLED', 'WAITLIST') NOT NULL DEFAULT 'CONFIRMED',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_registrations_userId_idx`(`userId`),
    INDEX `event_registrations_status_idx`(`status`),
    UNIQUE INDEX `event_registrations_eventId_userId_key`(`eventId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
