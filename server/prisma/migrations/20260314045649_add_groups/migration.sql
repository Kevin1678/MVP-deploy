-- AlterTable
ALTER TABLE `GameResult`
    ADD COLUMN `gameType` ENUM('MEMORAMA', 'COUNT_PICK', 'LIGHTS_SEQUENCE') NULL,
    ADD COLUMN `groupId` INTEGER NULL,
    ADD COLUMN `level` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `playedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `studentId` INTEGER NULL,
    MODIFY `score` INTEGER NULL,
    MODIFY `moves` INTEGER NULL,
    MODIFY `durationMs` INTEGER NULL;

-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `groupId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Group` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `teacherId` INTEGER NULL,

    INDEX `Group_teacherId_idx`(`teacherId`),
    UNIQUE INDEX `Group_teacherId_name_key`(`teacherId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ParentStudent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `relationType` ENUM('MOTHER', 'FATHER', 'TUTOR', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ParentStudent_parentId_idx`(`parentId`),
    INDEX `ParentStudent_studentId_idx`(`studentId`),
    UNIQUE INDEX `ParentStudent_parentId_studentId_key`(`parentId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `GameResult_studentId_playedAt_idx` ON `GameResult`(`studentId`, `playedAt`);

-- CreateIndex
CREATE INDEX `GameResult_groupId_playedAt_idx` ON `GameResult`(`groupId`, `playedAt`);

-- CreateIndex
CREATE INDEX `GameResult_gameType_playedAt_idx` ON `GameResult`(`gameType`, `playedAt`);

-- CreateIndex
CREATE INDEX `User_groupId_idx` ON `User`(`groupId`);

-- AddForeignKey
ALTER TABLE `User`
    ADD CONSTRAINT `User_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Group`
    ADD CONSTRAINT `Group_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentStudent`
    ADD CONSTRAINT `ParentStudent_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParentStudent`
    ADD CONSTRAINT `ParentStudent_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameResult`
    ADD CONSTRAINT `GameResult_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
