-- Add receipt_url column to fuel_log table for storing receipt image URLs
ALTER TABLE fuel_log ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add receipt_metadata column for OCR extraction data
ALTER TABLE fuel_log ADD COLUMN IF NOT EXISTS receipt_metadata JSONB;
