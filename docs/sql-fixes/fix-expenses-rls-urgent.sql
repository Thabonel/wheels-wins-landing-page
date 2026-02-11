-- URGENT FIX: Expenses RLS Policy Type Mismatch
-- Issue: user_id is UUID but policy casts auth.uid() to text
-- This prevents expense insertions from working

-- Fix expenses RLS policies with correct UUID casting
DROP POLICY IF EXISTS "expenses_fixed_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_simple_user_policy" ON expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

-- Create correct policies with proper UUID casting
CREATE POLICY "Users can view own expenses" ON expenses
FOR SELECT USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
FOR INSERT WITH CHECK ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
FOR UPDATE USING ((select auth.uid())::uuid = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
FOR DELETE USING ((select auth.uid())::uuid = user_id);