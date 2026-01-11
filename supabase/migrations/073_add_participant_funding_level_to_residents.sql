-- Migration: Add participant funding level label to residents
-- Description: Adds a reference-only label field for tracking SDA funding arrangements
-- This is metadata only and does NOT drive billing, pricing, or claims logic

-- Add participant_funding_level_label to residents table
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS participant_funding_level_label TEXT NULL;

COMMENT ON COLUMN residents.participant_funding_level_label IS 'Optional label describing the participant''s SDA funding arrangement (e.g., "Robust – 2 residents"). Reference only, does not drive billing logic.';

-- Optionally add notes field for additional context
ALTER TABLE residents
ADD COLUMN IF NOT EXISTS participant_funding_level_notes TEXT NULL;

COMMENT ON COLUMN residents.participant_funding_level_notes IS 'Optional notes about the participant funding arrangement. Reference only.';

