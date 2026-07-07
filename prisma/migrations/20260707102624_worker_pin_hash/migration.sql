/*
  Warnings:

  - You are about to drop the column `pin` on the `Worker` table. All the data in the column will be lost.
  - Added the required column `pinHash` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "pin",
ADD COLUMN     "pinHash" TEXT NOT NULL;
