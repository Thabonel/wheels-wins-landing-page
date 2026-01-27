-- Migration: Add filled_to_top column to fuel_log table
-- Date: 2026-01-28
-- Purpose: Track whether fuel tank was filled to top for accurate consumption calculations

ALTER TABLE fuel_log ADD COLUMN IF NOT EXISTS filled_to_top BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN fuel_log.filled_to_top IS 'Indicates if the tank was filled to the top. Required for accurate consumption calculations.';
