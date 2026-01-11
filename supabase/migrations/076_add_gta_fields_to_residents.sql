-- Migration: Add General Tenancy Agreement (GTA) reference fields to residents
-- Description: Store basic GTA information for resident occupancy
-- This is reference data only and does NOT drive automated lease workflows or MRRC calculations

-- Add GTA fields to residents table (stored per occupancy/contract)
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS gta_reference TEXT NULL;

ALTER TABLE residents
ADD COLUMN IF NOT EXISTS gta_start_date DATE NULL;

ALTER TABLE residents
ADD COLUMN IF NOT EXISTS gta_end_date DATE NULL;

COMMENT ON COLUMN residents.gta_reference IS 'General Tenancy Agreement reference/identifier. Reference only, used for reminders and reporting.';
COMMENT ON COLUMN residents.gta_start_date IS 'GTA start date. Reference only.';
COMMENT ON COLUMN residents.gta_end_date IS 'GTA end date. Used to trigger renewal reminders (typically 2 months before expiry).';

-- Add index for querying GTAs approaching expiry (for reminder purposes)
CREATE INDEX IF NOT EXISTS idx_residents_gta_end_date ON residents(gta_end_date) WHERE gta_end_date IS NOT NULL;

