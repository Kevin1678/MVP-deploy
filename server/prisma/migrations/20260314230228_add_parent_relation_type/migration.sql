-- AlterTable
ALTER TABLE `ParentStudent`
    MODIFY `relationType` ENUM('FATHER', 'MOTHER', 'TUTOR', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX `ParentStudent_studentId_relationType_idx`
    ON `ParentStudent`(`studentId`, `relationType`);
