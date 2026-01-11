-- Migration: Add funding management type and plan manager link to residents
-- Description: Track how participant's funding is managed (NDIA, Plan Managed, Self Managed)
-- This is reference data only and does NOT drive automated invoicing or claims logic

-- Add funding_management_type to residents table
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS funding_management_type TEXT NULL
  CHECK (funding_management_type IN ('ndia', 'plan_managed', 'self_managed', 'unknown'));

COMMENT ON COLUMN residents.funding_management_type IS 'How the participant''s NDIS funding is managed: ndia (NDIA Managed), plan_managed (Plan Managed), self_managed (Self Managed), or unknown. Reference only.';

-- Add plan_manager_id to residents table
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS plan_manager_id UUID NULL
  REFERENCES plan_managers(id) ON DELETE SET NULL;

COMMENT ON COLUMN residents.plan_manager_id IS 'Link to Plan Manager if funding_management_type is plan_managed. NULL for NDIA/self-managed or if not set.';

-- Add index for plan_manager_id lookups
CREATE INDEX IF NOT EXISTS idx_residents_plan_manager_id ON residents(plan_manager_id);

