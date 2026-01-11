-- ============================================================================
-- ADD OOA (ONSITE OVERNIGHT ASSISTANCE) FIELDS TO HOUSES
-- ============================================================================
-- Add simple OOA indicator and optional notes to properties.
-- This is metadata only - no staffing, scheduling, or billing logic.
-- ============================================================================

-- Add OOA fields to houses table
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS has_ooa BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS ooa_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.houses.has_ooa IS 'Indicates whether property has Onsite Overnight Assistance (OOA) - metadata only';
COMMENT ON COLUMN public.houses.ooa_notes IS 'Optional notes about OOA arrangement - metadata only';

