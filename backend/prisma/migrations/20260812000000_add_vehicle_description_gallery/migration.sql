-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "description" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
