-- CreateTable
CREATE TABLE "AgencyCustomerNote" (
    "id" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "AgencyCustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyCustomerNote_agencyId_customerId_key" ON "AgencyCustomerNote"("agencyId", "customerId");

-- AddForeignKey
ALTER TABLE "AgencyCustomerNote" ADD CONSTRAINT "AgencyCustomerNote_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyCustomerNote" ADD CONSTRAINT "AgencyCustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
