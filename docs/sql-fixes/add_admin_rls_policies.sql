-- Medical Document Upload Fix - Add Admin Role RLS Policies
-- Date: December 27, 2025
-- Purpose: Allow admin role to access medical_records table
-- Root Cause: RLS policies only allowed 'authenticated' role, not 'admin' role

-- Add admin role INSERT policy for medical_records
CREATE POLICY "admin_insert_medical_records" ON medical_records
FOR INSERT TO admin
WITH CHECK (auth.uid() = user_id);

-- Add admin role SELECT policy
CREATE POLICY "admin_select_medical_records" ON medical_records
FOR SELECT TO admin
USING (auth.uid() = user_id);

-- Add admin role UPDATE policy
CREATE POLICY "admin_update_medical_records" ON medical_records
FOR UPDATE TO admin
USING (auth.uid() = user_id);

-- Add admin role DELETE policy
CREATE POLICY "admin_delete_medical_records" ON medical_records
FOR DELETE TO admin
USING (auth.uid() = user_id);

-- Verify policies were created successfully
SELECT
  policyname,
  cmd,
  roles::text[],
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'medical_records'
  AND 'admin' = ANY(roles);
