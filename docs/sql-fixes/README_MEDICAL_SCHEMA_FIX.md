# Medical Records Schema Fix - Add Missing Columns

**Date**: December 27, 2025
**Status**: Ready to Apply
**Fix Type**: SQL (ALTER TABLE migration)

---

## Quick Summary

**Problem**: Medical document upload fails with HTTP 400 error
**Root Cause**: `medical_records` table missing 8 columns that code tries to INSERT
**Solution**: Run SQL migration to add missing columns
**Time to Fix**: 2 minutes

---

## The Problem Discovered

After 7 previous fixes, we found the real issue: **Schema mismatch between database and code**.

**Database has only 6 columns:**
- ✅ `id` (uuid)
- ✅ `user_id` (uuid)
- ✅ `title` (varchar)
- ⚠️ `description` (text) - code uses `summary`
- ⚠️ `date_recorded` (date) - code uses `test_date`
- ✅ `created_at` (timestamptz)

**Code tries to INSERT 9 additional fields:**
- ❌ `type` (medical_record_type enum)
- ❌ `summary` (text)
- ❌ `tags` (text[])
- ❌ `test_date` (date)
- ❌ `document_url` (text)
- ❌ `content_json` (jsonb)
- ❌ `ocr_text` (text)
- ❌ `updated_at` (timestamptz)

**Result**: Supabase returns 400 Bad Request because columns don't exist.

---

## How to Apply (3 Steps)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql
2. Create a new query

### Step 2: Run the SQL Fix

1. Copy the contents of `docs/sql-fixes/add_medical_records_missing_columns.sql`
2. Paste into SQL Editor
3. Click **Run** button

**Expected Output**:
```
column_name       | data_type           | is_nullable
------------------|---------------------|------------
id                | uuid                | NO
user_id           | uuid                | NO
title             | character varying   | YES
description       | text                | YES
date_recorded     | date                | YES
created_at        | timestamp...        | YES
type              | USER-DEFINED        | YES  ← NEW
summary           | text                | YES  ← NEW
tags              | ARRAY               | YES  ← NEW
test_date         | date                | YES  ← NEW
document_url      | text                | YES  ← NEW
content_json      | jsonb               | YES  ← NEW
ocr_text          | text                | YES  ← NEW
updated_at        | timestamp...        | YES  ← NEW
```

If you see the new columns listed, the migration succeeded! ✅

### Step 3: Test Medical Document Upload

1. **Refresh your browser** (F5) on staging site
2. Navigate to: **You → Medical → Upload Document**
3. Select a medical document file
4. Fill in title
5. Click **Upload**
6. **Expected Result**:
   - ✅ Success toast: "Medical record added successfully"
   - ✅ Document appears in medical records list
   - ✅ NO 400 error in browser console

---

## What This Migration Does

The SQL migration:

1. **Creates `medical_record_type` enum** (if doesn't exist):
   - Values: document, lab_result, prescription, insurance_card, doctor_note, vaccination, imaging, other

2. **Adds 8 missing columns**:
   - `type` (medical_record_type enum)
   - `summary` (text, nullable)
   - `tags` (text array, nullable)
   - `test_date` (date, nullable)
   - `document_url` (text, nullable)
   - `content_json` (jsonb, nullable)
   - `ocr_text` (text, nullable)
   - `updated_at` (timestamptz with default now())

3. **Migrates existing data**:
   - Copies `description` → `summary`
   - Copies `date_recorded` → `test_date`

4. **Keeps old columns** for backward compatibility:
   - `description` column remains (in case other code uses it)
   - `date_recorded` column remains

---

## Why Previous Fixes Didn't Work

All 7 previous fixes were addressing the wrong layer:

- ✅ Fix 1-4: GRANT permissions (correct, but not the issue)
- ✅ Fix 5: Code refactoring (correct, but not the issue)
- ✅ Fix 6: RLS policies (correct, but not the issue)
- ✅ Fix 7: TypeScript types (correct, but **types don't create database columns!**)

**The Real Issue**: Database table schema didn't match the code.

**Critical Learning**: TypeScript types are **compile-time only**. They help during development but have **zero effect** on the actual database schema. You can add types.ts definitions all day long, but if the database columns don't exist, runtime API calls will fail.

---

## Verification Checklist

After running the migration:

- [ ] SQL executed without errors
- [ ] Verification query shows 14 columns (6 original + 8 new)
- [ ] Refreshed browser on staging site
- [ ] Medical document upload succeeds
- [ ] Success toast appears
- [ ] Document visible in medical records list
- [ ] NO 400 error in console

---

## If This Fix Doesn't Work

If upload still fails after this migration:

1. **Verify columns were added**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'medical_records'
   ORDER BY ordinal_position;
   ```
   Should show 14 columns.

2. **Check for different error**:
   - Expand error Object in browser console
   - Look for new error message
   - May reveal a different issue (enum values, etc.)

3. **Test direct SQL INSERT**:
   ```sql
   INSERT INTO medical_records (user_id, title, type)
   VALUES (auth.uid(), 'Test', 'document')
   RETURNING *;
   ```
   If this works, issue is frontend code. If fails, issue is database.

---

## Complete Fix History

| Fix | What It Fixed | Status | File |
|-----|--------------|--------|------|
| Fix 1 | Frontend schema restriction | ✅ Applied | commit 9c8294f2 |
| Fix 2 | Admin storage permissions | ✅ Applied | SQL |
| Fix 3 | Admin public schema permissions | ✅ Applied | SQL |
| Fix 4 | Admin auth permissions | ✅ Applied | SQL |
| Fix 5 | Duplicate user_id bug | ✅ Applied | commit 5eaaa40c |
| Fix 6 | Admin RLS policies | ✅ Applied | SQL |
| Fix 7 | TypeScript type definitions | ✅ Applied | commit b6b7ebca |
| **Fix 8** | **Database schema columns** | ⬜ **READY** | **`add_medical_records_missing_columns.sql`** |

---

**Status**: Ready to Apply
**Expected Outcome**: Medical document upload will work immediately after SQL migration
**Next Step**: User runs SQL in Supabase SQL Editor and tests upload
