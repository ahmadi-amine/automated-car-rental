-- Add email-verification fields to Customer
ALTER TABLE "Customer" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "verificationTokenHash" TEXT;
ALTER TABLE "Customer" ADD COLUMN "verificationTokenExpiry" TIMESTAMP(3);

-- Existing password accounts predate verification; treat them as already verified
-- so this change never locks anyone out.
UPDATE "Customer" SET "emailVerified" = true WHERE "password" IS NOT NULL;
