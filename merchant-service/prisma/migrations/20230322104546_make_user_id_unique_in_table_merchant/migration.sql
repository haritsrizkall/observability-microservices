/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Merchant_userId_key` ON `Merchant`(`userId`);
