-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'STUDENT', 'TEACHER', 'PARENT') NOT NULL DEFAULT 'STUDENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `firstName` VARCHAR(191) NOT NULL,
    `lastNameP` VARCHAR(191) NOT NULL,
    `lastNameM` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameResult` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `game` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `moves` INTEGER NOT NULL,
    `durationMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GameResult_userId_idx`(`userId`),
    INDEX `GameResult_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GameResult` ADD CONSTRAINT `GameResult_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
