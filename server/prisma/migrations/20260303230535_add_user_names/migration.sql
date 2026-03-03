/*
  Warnings:

  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastNameM` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastNameP` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `firstName` VARCHAR(191) NOT NULL,
    ADD COLUMN `lastNameM` VARCHAR(191) NOT NULL,
    ADD COLUMN `lastNameP` VARCHAR(191) NOT NULL,
    MODIFY `role` ENUM('ADMIN', 'STUDENT', 'TEACHER', 'PARENT') NOT NULL DEFAULT 'STUDENT';
