-- Fix Medical Records Table Schema
-- Date: December 27, 2025
-- Problem: medical_records table missing columns that MedicalService.ts tries to INSERT
-- This migration adds all missing columns to match types.ts schema

-- Step 1: Create medical_record_type enum if it doesn't exist
DO $$
BEGIN
  CREATE TYPE medical_record_type AS ENUM (
    'document',
    'lab_result',
    'prescription',
    'insurance_card',
    'doctor_note',
    'vaccination',
    'imaging',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add missing columns to medical_records table
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS type medical_record_type,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS test_date date,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS content_json jsonb,
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Step 3: Migrate existing data
-- Copy description to summary if summary is null
UPDATE medical_records
SET summary = description
WHERE summary IS NULL AND description IS NOT NULL;

-- Copy date_recorded to test_date if test_date is null
UPDATE medical_records
SET test_date = date_recorded
WHERE test_date IS NULL AND date_recorded IS NOT NULL;

-- Step 4: Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'medical_records'
ORDER BY ordinal_position;
