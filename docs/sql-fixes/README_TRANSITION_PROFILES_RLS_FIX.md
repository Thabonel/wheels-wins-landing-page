# Transition Profiles RLS Fix - January 2026

## Issue
Users getting "Failed to update settings" error when trying to update departure date or other settings in Life Transition Navigator.

## Root Cause
The RLS policies on `transition_profiles` table had unnecessary `::text` type casts on UUID columns, causing comparison failures:

```sql
-- BROKEN
USING (((auth.uid())::text = (user_id)::text))
```

Both `auth.uid()` and `user_id` are UUID type, so casting to text was unnecessary and caused issues.

## Fix Applied

Removed the text casts from all RLS policies:

```sql
DROP POLICY IF EXISTS "Users can view their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can insert their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can update their own transition profile" ON transition_profiles;
DROP POLICY IF EXISTS "Users can delete their own transition profile" ON transition_profiles;

-- Recreate with proper UUID comparison (no text casting)
CREATE POLICY "Users can view their own transition profile"
ON transition_profiles FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transition profile"
ON transition_profiles FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transition profile"
ON transition_profiles FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transition profile"
ON transition_profiles FOR DELETE
TO public
USING (auth.uid() = user_id);
```

## Affected Components
- `src/components/transition/TransitionSettingsDialog.tsx` (line 50-62)
- `src/components/settings/TransitionSettings.tsx` (line 64-72)

## Verification

Test the fix:
1. Navigate to Life Transition Navigator
2. Click settings/edit button
3. Update departure date
4. Save changes
5. Should see "Settings updated successfully" toast (not error)

## Status
✅ Fixed on both staging and production (shared database)

**Date Applied**: January 9, 2026
**Applied By**: Claude Code
**Severity**: High (blocking user feature)
