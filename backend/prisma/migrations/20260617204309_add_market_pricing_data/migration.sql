-- DropIndex
DROP INDEX "MarketPricingData_category_idx";

-- DropIndex
DROP INDEX "MarketPricingData_location_idx";

-- AlterTable
ALTER TABLE "MarketPricingData" ALTER COLUMN "updatedAt" DROP DEFAULT;
