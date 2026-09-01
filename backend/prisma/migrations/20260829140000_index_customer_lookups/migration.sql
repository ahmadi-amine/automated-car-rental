-- Speed up the frequent Customer lookups by email (auth + booking dedup)
-- and by verification token (email verification).
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_verificationTokenHash_idx" ON "Customer"("verificationTokenHash");
