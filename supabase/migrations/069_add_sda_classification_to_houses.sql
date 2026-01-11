-- ============================================================================
-- ADD SDA CLASSIFICATION FIELDS TO HOUSES
-- ============================================================================
-- Add dwelling type, design category, and registration status to properties.
-- This is metadata only for visibility and future reporting.
-- No billing logic, pricing, or complex validation.
-- ============================================================================

-- Add SDA classification columns to houses table
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS dwelling_type TEXT;

ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS sda_design_category TEXT;

ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS sda_registration_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.houses.dwelling_type IS 'SDA dwelling type (e.g., House, Villa, Apartment) - metadata only';
COMMENT ON COLUMN public.houses.sda_design_category IS 'SDA design category (e.g., Improved Liveability, Fully Accessible, Robust, High Physical Support) - metadata only';
COMMENT ON COLUMN public.houses.sda_registration_status IS 'SDA registration status (e.g., Registered, In Progress, Unknown) - metadata only';

