-- Medical Records Feature Migration
-- Creates tables for medical documents, medications, and emergency information
-- Author: Wheels & Wins
-- Date: August 30, 2025

-- ============================================
-- 1. MEDICAL RECORDS TABLE
-- ============================================
-- Stores medical documents and records (lab results, prescriptions, etc.)

CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'document', 'lab_result', 'prescription', 'insurance_card',
        'doctor_note', 'vaccination', 'imaging', 'other'
    )),
    title TEXT NOT NULL,
    summary TEXT,
    tags TEXT[],
    test_date TIMESTAMPTZ,
    document_url TEXT, -- Supabase Storage URL
    content_json JSONB, -- Flexible storage for parsed content, findings, etc.
    ocr_text TEXT, -- OCR extracted text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_medical_records_user_id ON medical_records(user_id);
CREATE INDEX idx_medical_records_type ON medical_records(type);
CREATE INDEX idx_medical_records_created_at ON medical_records(created_at DESC);
CREATE INDEX idx_medical_records_tags ON medical_records USING GIN(tags);

-- ============================================
-- 2. MEDICAL MEDICATIONS TABLE
-- ============================================
-- Tracks medications, dosages, and refill schedules

CREATE TABLE IF NOT EXISTS medical_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT CHECK (frequency IN (
        'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily',
        'as_needed', 'weekly', 'monthly'
    )),
    refill_date DATE,
    prescribed_by TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_medical_medications_user_id ON medical_medications(user_id);
CREATE INDEX idx_medical_medications_active ON medical_medications(active);
CREATE INDEX idx_medical_medications_refill_date ON medical_medications(refill_date);

-- ============================================
-- 3. MEDICAL EMERGENCY INFO TABLE
-- ============================================
-- Stores critical emergency medical information

CREATE TABLE IF NOT EXISTS medical_emergency_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    blood_type TEXT,
    allergies TEXT[],
    medical_conditions TEXT[],
    emergency_contacts JSONB, -- Array of {name, phone, relationship, isPrimary}
    primary_doctor JSONB, -- {name, phone, practice}
    insurance_info JSONB, -- {provider, policyNumber, groupNumber, phone}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_medical_emergency_info_user_id ON medical_emergency_info(user_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================
-- Ensure users can only access their own medical data

-- Enable RLS on all medical tables
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_emergency_info ENABLE ROW LEVEL SECURITY;

-- Medical Records Policies
CREATE POLICY "Users can view own medical records" 
    ON medical_records FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own medical records" 
    ON medical_records FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medical records" 
    ON medical_records FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medical records" 
    ON medical_records FOR DELETE 
    USING (auth.uid() = user_id);

-- Medical Medications Policies
CREATE POLICY "Users can view own medications" 
    ON medical_medications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own medications" 
    ON medical_medications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications" 
    ON medical_medications FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications" 
    ON medical_medications FOR DELETE 
    USING (auth.uid() = user_id);

-- Medical Emergency Info Policies
CREATE POLICY "Users can view own emergency info" 
    ON medical_emergency_info FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own emergency info" 
    ON medical_emergency_info FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency info" 
    ON medical_emergency_info FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency info" 
    ON medical_emergency_info FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
-- Automatically update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_medical_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON medical_records
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_updated_at();

CREATE TRIGGER update_medical_medications_updated_at
    BEFORE UPDATE ON medical_medications
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_updated_at();

CREATE TRIGGER update_medical_emergency_info_updated_at
    BEFORE UPDATE ON medical_emergency_info
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_updated_at();

-- ============================================
-- 6. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment below to add sample data for testing

/*
-- Sample emergency info
INSERT INTO medical_emergency_info (user_id, blood_type, allergies, medical_conditions, emergency_contacts)
VALUES (
    auth.uid(),
    'O+',
    ARRAY['Penicillin', 'Peanuts'],
    ARRAY['Hypertension', 'Diabetes Type 2'],
    '[
        {"name": "Jane Doe", "phone": "555-0123", "relationship": "Spouse", "isPrimary": true},
        {"name": "John Smith", "phone": "555-0456", "relationship": "Friend", "isPrimary": false}
    ]'::jsonb
);

-- Sample medication
INSERT INTO medical_medications (user_id, name, dosage, frequency, refill_date, prescribed_by, active)
VALUES (
    auth.uid(),
    'Metformin',
    '500mg',
    'twice_daily',
    '2025-09-15',
    'Dr. Johnson',
    true
);
*/

-- ============================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE medical_records IS 'Stores medical documents and records for users';
COMMENT ON TABLE medical_medications IS 'Tracks user medications and refill schedules';
COMMENT ON TABLE medical_emergency_info IS 'Critical emergency medical information for users';

COMMENT ON COLUMN medical_records.content_json IS 'Flexible JSON storage for test results, findings, and parsed content';
COMMENT ON COLUMN medical_records.ocr_text IS 'Text extracted from documents via OCR';
COMMENT ON COLUMN medical_emergency_info.emergency_contacts IS 'JSON array of emergency contact objects';

-- ============================================
-- 8. GRANTS (if needed for service role)
-- ============================================
-- Grant necessary permissions to service role if required
-- GRANT ALL ON medical_records TO service_role;
-- GRANT ALL ON medical_medications TO service_role;
-- GRANT ALL ON medical_emergency_info TO service_role;