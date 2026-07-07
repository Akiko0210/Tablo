-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "optionLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
