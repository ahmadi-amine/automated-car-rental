CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "MarketPricingData" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "Category" NOT NULL,
    "location" TEXT NOT NULL,
    "actualPriceMad" DOUBLE PRECISION NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPricingData_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketPricingData_category_idx" ON "MarketPricingData"("category");
CREATE INDEX "MarketPricingData_location_idx" ON "MarketPricingData"("location");
