-- Fix medical tables missing columns
-- Root cause: Tables were created with minimal schema but frontend expects full schema
-- Applied: February 15, 2026

-- medical_emergency_info was missing: blood_type, allergies, medical_conditions,
-- emergency_contacts (jsonb), primary_doctor (jsonb), insurance_info (jsonb), updated_at
ALTER TABLE public.medical_emergency_info
  ADD COLUMN IF NOT EXISTS blood_type varchar,
  ADD COLUMN IF NOT EXISTS allergies text[],
  ADD COLUMN IF NOT EXISTS medical_conditions text[],
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb,
  ADD COLUMN IF NOT EXISTS primary_doctor jsonb,
  ADD COLUMN IF NOT EXISTS insurance_info jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- medical_medications was missing: frequency, refill_date, prescribed_by, notes, updated_at
ALTER TABLE public.medical_medications
  ADD COLUMN IF NOT EXISTS frequency varchar,
  ADD COLUMN IF NOT EXISTS refill_date date,
  ADD COLUMN IF NOT EXISTS prescribed_by varchar,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
