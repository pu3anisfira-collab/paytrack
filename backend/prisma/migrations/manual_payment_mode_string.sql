-- Migration: Convert PaymentMode enum to TEXT
-- This allows adding new payment methods without further schema changes.

-- Step 1: Change column type from enum to text
ALTER TABLE transactions
  ALTER COLUMN "paymentMode" TYPE TEXT USING "paymentMode"::TEXT;

-- Step 2: Drop the old enum (safe - column no longer references it)
DROP TYPE IF EXISTS "PaymentMode";
