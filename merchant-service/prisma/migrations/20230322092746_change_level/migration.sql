/*
  Warnings:

  - You are about to drop the column `merchantLevel` on the `Merchant` table. All the data in the column will be lost.
  - Added the required column `levelId` to the `Merchant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Merchant` DROP COLUMN `merchantLevel`,
    ADD COLUMN `levelId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Merchant` ADD CONSTRAINT `Merchant_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `Level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
