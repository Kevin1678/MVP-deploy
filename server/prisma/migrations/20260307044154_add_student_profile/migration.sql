-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `createdById` INTEGER NULL,
  MODIFY `lastNameM` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StudentProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `visualCondition` ENUM('NONE', 'PROTANOPIA', 'TRITANOPIA', 'LOW_VISION') NOT NULL DEFAULT 'NONE',
    `auditoryCondition` ENUM('NONE', 'HARD_OF_HEARING', 'DEAF') NOT NULL DEFAULT 'NONE',
    `fontScale` INTEGER NOT NULL DEFAULT 100,
    `highContrast` BOOLEAN NOT NULL DEFAULT false,
    `textToSpeechEnabled` BOOLEAN NOT NULL DEFAULT false,
    `voiceInstructions` BOOLEAN NOT NULL DEFAULT false,
    `captionsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `visualAlertsEnabled` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `StudentProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User`
  ADD CONSTRAINT `User_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentProfile`
  ADD CONSTRAINT `StudentProfile_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
