-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;
