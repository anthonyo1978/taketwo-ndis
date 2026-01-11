-- ============================================================================
-- ADD ENROLMENT DATE TO HOUSES
-- ============================================================================
-- Add enrolment date field for recording when property was enrolled/activated.
-- This is reference metadata only - no billing or workflow logic.
-- ============================================================================

-- Add enrolment_date field to houses table
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS enrolment_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.houses.enrolment_date IS 'Date the property was enrolled / became active (e.g. SDA enrolment date) - reference metadata only';

