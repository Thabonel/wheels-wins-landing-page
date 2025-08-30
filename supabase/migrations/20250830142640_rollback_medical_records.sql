-- Rollback Migration for Medical Records Feature
-- This file can be used to cleanly remove all medical tables and related objects
-- IMPORTANT: Only run this if you need to completely remove the medical feature

-- ============================================
-- 1. DROP POLICIES
-- ============================================

-- Drop all RLS policies for medical_records
DROP POLICY IF EXISTS "Users can view own medical records" ON medical_records;
DROP POLICY IF EXISTS "Users can create own medical records" ON medical_records;
DROP POLICY IF EXISTS "Users can update own medical records" ON medical_records;
DROP POLICY IF EXISTS "Users can delete own medical records" ON medical_records;

-- Drop all RLS policies for medical_medications
DROP POLICY IF EXISTS "Users can view own medications" ON medical_medications;
DROP POLICY IF EXISTS "Users can create own medications" ON medical_medications;
DROP POLICY IF EXISTS "Users can update own medications" ON medical_medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON medical_medications;

-- Drop all RLS policies for medical_emergency_info
DROP POLICY IF EXISTS "Users can view own emergency info" ON medical_emergency_info;
DROP POLICY IF EXISTS "Users can create own emergency info" ON medical_emergency_info;
DROP POLICY IF EXISTS "Users can update own emergency info" ON medical_emergency_info;
DROP POLICY IF EXISTS "Users can delete own emergency info" ON medical_emergency_info;

-- ============================================
-- 2. DROP TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_medical_records_updated_at ON medical_records;
DROP TRIGGER IF EXISTS update_medical_medications_updated_at ON medical_medications;
DROP TRIGGER IF EXISTS update_medical_emergency_info_updated_at ON medical_emergency_info;

-- ============================================
-- 3. DROP FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS update_medical_updated_at();

-- ============================================
-- 4. DROP INDEXES
-- ============================================

-- Drop indexes for medical_records
DROP INDEX IF EXISTS idx_medical_records_user_id;
DROP INDEX IF EXISTS idx_medical_records_type;
DROP INDEX IF EXISTS idx_medical_records_created_at;
DROP INDEX IF EXISTS idx_medical_records_tags;

-- Drop indexes for medical_medications
DROP INDEX IF EXISTS idx_medical_medications_user_id;
DROP INDEX IF EXISTS idx_medical_medications_active;
DROP INDEX IF EXISTS idx_medical_medications_refill_date;

-- Drop index for medical_emergency_info
DROP INDEX IF EXISTS idx_medical_emergency_info_user_id;

-- ============================================
-- 5. DROP TABLES
-- ============================================

DROP TABLE IF EXISTS medical_emergency_info CASCADE;
DROP TABLE IF EXISTS medical_medications CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;

-- ============================================
-- 6. CONFIRMATION
-- ============================================

-- This rollback is complete. All medical-related database objects have been removed.