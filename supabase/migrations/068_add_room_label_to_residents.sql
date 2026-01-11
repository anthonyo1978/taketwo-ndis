-- ============================================================================
-- ADD ROOM LABEL TO RESIDENTS
-- ============================================================================
-- Add optional room/unit reference for residents within a property.
-- This is a convenience field only, NOT a room management system.
-- ============================================================================

-- Add room_label column to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS room_label TEXT;

-- Add constraint for reasonable length
ALTER TABLE public.residents 
ADD CONSTRAINT room_label_length CHECK (char_length(room_label) <= 50);

-- Add comment for documentation
COMMENT ON COLUMN public.residents.room_label IS 'Optional room/unit reference (e.g., Room 1, Bedroom A) - convenience field only, not a room management system';

