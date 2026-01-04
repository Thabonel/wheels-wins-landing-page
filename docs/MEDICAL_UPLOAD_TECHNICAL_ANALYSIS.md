# Medical Document Upload - Complete Technical Analysis

**Date**: December 27, 2025
**Status**: All Known Fixes Applied - Error Persists
**Purpose**: Technical analysis for handoff to another developer

---

## Executive Summary

Medical document upload fails with HTTP 400 error on `medical_records` table INSERT, despite three comprehensive fixes being applied and verified. Storage upload now works correctly (file reaches S3-compatible storage), but database record creation fails at `MedicalContext.tsx:149`.

**Error Pattern**: 500 → 500 → 400 → 400 (improving but not resolved)

**Critical Observation**: HTTP status changed from 500 (server/missing relation) to 400 (client/permission) after fixes, indicating progress but revealing deeper issue.

---

## Error Timeline & Evolution

### Initial Error (Before Any Fixes)
```
StorageApiError: Bucket not found
relation "objects" does not exist
HTTP 500 Internal Server Error
Location: Storage API attempting INSERT into storage.objects
```

### After Fix 1 (Frontend Schema Restriction Removed)
```
Same error: relation "objects" does not exist
HTTP 500 Internal Server Error
Status: Fix deployed successfully (commit 9c8294f2) but error unchanged
```

### After Fix 2 (Admin Role Storage Permissions Granted)
```
Storage errors: GONE ✅
New error: Failed to load resource: 400 () on /rest/v1/medical_records
Location: MedicalContext.tsx:149
Status: Significant progress - storage layer working
```

### After Fix 3 (Admin Role Public Schema Permissions Granted) - CURRENT
```
Error: Failed to load resource: 400 () on /rest/v1/medical_records
Location: MedicalContext.tsx:149
Status: All permissions verified as granted, error persists
```

---

## All Fixes Attempted

### Fix 1: Frontend Supabase Client Schema Restriction

**File**: `src/integrations/supabase/client.ts`
**Commit**: 9c8294f2
**Deployed**: Staging branch, confirmed in production at 11:16 PM

**Change Made**:
```typescript
// BEFORE (WRONG)
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: { ... },
    realtime: { ... },
    global: { ... },
    db: {
      schema: 'public'  // ← Blocked storage schema access
    }
  }
);

// AFTER (FIXED)
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: { ... },
    realtime: { ... },
    global: { ... }
    // Removed db.schema to allow access to all schemas (public, storage, etc.)
  }
);
```

**Why This Was Expected to Work**:
- Supabase client was restricted to `public` schema only
- Storage API needs access to `storage.objects` table in `storage` schema
- Removing restriction should allow client to access all schemas

**Evidence Fix Was Applied**:
- Commit 9c8294f2 verified in git history
- Netlify deployment confirmed: "Production: staging@9c8294f2 published"
- Code change visible in deployed client.ts file

**Result**: Error persisted (revealed deeper backend issue)

---

### Fix 2: Admin Role Storage Permissions

**File**: `docs/sql-fixes/fix_admin_storage_permissions.sql`
**Applied**: Directly in Supabase SQL Editor
**Verification**: User provided query results showing all expected permissions

**SQL Executed**:
```sql
-- 1. Create admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
    RAISE NOTICE 'Created admin role';
  END IF;
END $$;

-- 2. Grant storage schema access
GRANT USAGE ON SCHEMA storage TO admin;

-- 3. Grant all table permissions
GRANT ALL ON storage.objects TO admin;
GRANT ALL ON storage.buckets TO admin;

-- 4. Inherit authenticated role permissions
GRANT authenticated TO admin;
```

**Why This Was Expected to Work**:
- JWT contains `role: "admin"` (not `role: "authenticated"`)
- Supabase uses JWT role claim as PostgreSQL session role
- Admin role needed explicit GRANT permissions on storage.objects
- Similar issue documented in GitHub Discussion #38107

**Evidence Fix Was Applied**:
User provided verification query results:
```
grantee | table_schema | table_name      | privilege_type
--------|--------------|-----------------|----------------
admin   | storage      | buckets         | DELETE
admin   | storage      | buckets         | INSERT
admin   | storage      | buckets         | REFERENCES
admin   | storage      | buckets         | SELECT
admin   | storage      | buckets         | TRIGGER
admin   | storage      | buckets         | TRUNCATE
admin   | storage      | buckets         | UPDATE
admin   | storage      | objects         | DELETE
admin   | storage      | objects         | INSERT
admin   | storage      | objects         | REFERENCES
admin   | storage      | objects         | SELECT
admin   | storage      | objects         | TRIGGER
admin   | storage      | objects         | TRUNCATE
admin   | storage      | objects         | UPDATE
(plus authenticated role permissions)
```

**Result**: Storage errors RESOLVED ✅ - but new 400 error on medical_records table

---

### Fix 3: Admin Role Public Schema Permissions

**File**: `docs/sql-fixes/fix_admin_public_tables_permissions.sql`
**Applied**: Directly in Supabase SQL Editor
**Verification**: User provided query results showing all expected permissions

**SQL Executed**:
```sql
-- Grant schema access
GRANT USAGE ON SCHEMA public TO admin;

-- Grant all table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;
```

**Why This Was Expected to Work**:
- Error changed from 500 (missing relation) to 400 (permission denied)
- 400 error indicates client/permission issue
- Admin role needed explicit permissions on medical_records table
- Same pattern as storage fix

**Evidence Fix Was Applied**:
User provided verification query results (24 privilege entries):
```
grantee | table_schema | table_name               | privilege_type
--------|--------------|--------------------------|----------------
admin   | public       | budgets                  | DELETE
admin   | public       | budgets                  | INSERT
admin   | public       | budgets                  | SELECT
admin   | public       | budgets                  | UPDATE
admin   | public       | expenses                 | DELETE
admin   | public       | expenses                 | INSERT
admin   | public       | expenses                 | SELECT
admin   | public       | expenses                 | UPDATE
admin   | public       | medical_emergency_info   | DELETE
admin   | public       | medical_emergency_info   | INSERT
admin   | public       | medical_emergency_info   | SELECT
admin   | public       | medical_emergency_info   | UPDATE
admin   | public       | medical_medications      | DELETE
admin   | public       | medical_medications      | INSERT
admin   | public       | medical_medications      | SELECT
admin   | public       | medical_medications      | UPDATE
admin   | public       | medical_records          | DELETE
admin   | public       | medical_records          | INSERT ← CRITICAL
admin   | public       | medical_records          | SELECT
admin   | public       | medical_records          | UPDATE
admin   | public       | profiles                 | DELETE
admin   | public       | profiles                 | INSERT
admin   | public       | profiles                 | SELECT
admin   | public       | profiles                 | UPDATE
```

**Result**: Error PERSISTS (400 on medical_records INSERT)

---

## Current Error Details

### Browser Console Output (After All Fixes)
```
kycoklimpzkyrecbjecn.supabase.co/rest/v1/medical_records?select=*:1
Failed to load resource: the server responded with a status of 400 ()

MedicalContext.tsx:149 Error adding medical record: Object
addRecord @ MedicalContext.tsx:149

DocumentUploadDialog.tsx:153 Upload error: Object
handleUpload @ DocumentUploadDialog.tsx:153
```

### Code Path (MedicalContext.tsx lines 133-153)
```typescript
const addRecord = async (record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>) => {
  if (!user?.id) return;

  try {
    const { data, error } = await supabase
      .from('medical_records')
      .insert({ ...record, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    setRecords(prev => [data, ...prev]);
    toast.success('Medical record added successfully');
    return data;
  } catch (err) {
    console.error('Error adding medical record:', err);  // ← LINE 149 - ERROR HERE
    toast.error('Failed to add medical record');
    throw err;
  }
};
```

### Request Details
- **Method**: POST
- **Endpoint**: `/rest/v1/medical_records?select=*`
- **Status**: 400 Bad Request
- **Body**: `{ ...record, user_id: user.id }`
- **Headers**: JWT with `role: "admin"`

---

## Technical Architecture Analysis

### JWT Token Structure
```json
{
  "algorithm": "HS256",
  "type": "JWT",
  "issuer": "kycoklimpzkyrecbjecn.supabase.co/auth/v1",
  "subject": "21a2151a-cd37-41d5-a1c7-124bb05e7a6a",
  "audience": "authenticated",
  "role": "admin",  ← CRITICAL: Custom role, not "authenticated"
  "claims": ["aud", "exp", "iat", "iss", "sub", "email", "phone", "app_metadata", ...]
}
```

### PostgreSQL Role Resolution
```
JWT role claim "admin"
  ↓
Supabase Auth validates JWT
  ↓
PostgreSQL session role = "admin"
  ↓
RLS policies evaluated with admin role
  ↓
Table permissions checked for admin role
```

### RLS Policies on medical_records Table

**From**: `docs/sql-fixes/20250830142640_add_medical_records.sql` (lines 94-109)

```sql
-- SELECT Policy
CREATE POLICY "Users can view own medical records"
    ON medical_records FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT Policy
CREATE POLICY "Users can create own medical records"
    ON medical_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE Policy
CREATE POLICY "Users can update own medical records"
    ON medical_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE Policy
CREATE POLICY "Users can delete own medical records"
    ON medical_records FOR DELETE
    USING (auth.uid() = user_id);
```

**Key Observation**: All policies use `auth.uid()` function which:
1. Extracts `sub` claim from JWT token
2. Should work for both `authenticated` and `admin` roles
3. Returns: `21a2151a-cd37-41d5-a1c7-124bb05e7a6a`

### Table Schema (medical_records)
```sql
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Verified Facts

### ✅ Infrastructure Confirmed Working
1. **Storage bucket exists**: `medical-documents` bucket verified in Supabase
2. **Storage tables exist**: All 9 storage schema tables present
3. **Public tables exist**: medical_records table with correct schema
4. **RLS enabled**: 14 policies on storage.objects, 4 policies on medical_records
5. **File upload succeeds**: Browser logs show NO storage errors after Fix 2
6. **Admin role exists**: PostgreSQL role created via Fix 2

### ✅ Permissions Confirmed Granted
1. **Storage permissions**: admin has DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on storage.objects and storage.buckets
2. **Public permissions**: admin has DELETE, INSERT, SELECT, UPDATE on medical_records (and 5 other tables)
3. **Sequence permissions**: admin has USAGE, SELECT on all public sequences
4. **Schema access**: admin has USAGE on both public and storage schemas
5. **Role inheritance**: admin role granted authenticated role (inherits all authenticated permissions)

### ✅ JWT Token Confirmed Valid
1. **Role claim**: "admin" (intentional, not a bug)
2. **Subject claim**: "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"
3. **Audience claim**: "authenticated"
4. **Token validation**: No auth errors in browser logs
5. **Function call**: `auth.uid()` should return subject claim for admin role

### ✅ Code Deployment Confirmed
1. **Frontend fix**: Commit 9c8294f2 deployed to staging
2. **Schema restriction**: Removed from client.ts
3. **Supabase client**: Using correct instance from `@/integrations/supabase/client`
4. **Upload component**: DocumentUploadDialog.tsx uses correct client

---

## Unknown Factors

### ❓ RLS Policy Behavior with Admin Role
**Question**: Do RLS policies using `auth.uid()` properly recognize admin role?

**Evidence For**:
- `GRANT authenticated TO admin;` should make admin inherit authenticated permissions
- `auth.uid()` extracts from JWT, not from role name

**Evidence Against**:
- 400 error suggests permission/policy denial
- Error occurs specifically on INSERT operation
- Storage RLS policies work (different policy structure?)

### ❓ HTTP 400 vs Expected Error Type
**Question**: Why 400 (Bad Request) instead of 403 (Forbidden)?

**Observations**:
- 400 typically means client sent invalid data
- 403 would indicate permission denial
- Could indicate RLS policy WITH CHECK clause failing
- Could indicate missing required field or constraint violation

### ❓ Difference Between Storage Success and Database Failure
**Question**: Why does storage INSERT work but database INSERT fails?

**Pattern**:
- Storage: `INSERT INTO storage.objects` → SUCCESS ✅
- Database: `INSERT INTO medical_records` → FAIL ❌
- Both use admin role
- Both have RLS policies
- Both have permissions granted

**Difference**:
- Storage policies may use different auth mechanism
- medical_records policies ALL use `auth.uid() = user_id`
- Storage succeeded after GRANT, database failed after GRANT

### ❓ Role Inheritance Effectiveness
**Question**: Does `GRANT authenticated TO admin;` actually work for RLS?

**Uncertainty**:
- Command executed successfully
- Permissions show as granted
- But RLS may evaluate role membership differently
- May need explicit admin role in RLS policies

### ❓ Sequence/Trigger/Function Permissions
**Question**: Are there hidden dependencies requiring additional permissions?

**Possibilities**:
- Default value generation (gen_random_uuid())
- Triggers on INSERT
- Functions called by RLS policies
- Sequence permissions for auto-incrementing fields

---

## Error Pattern Analysis

### Evolution of HTTP Status Codes
```
Fix 0: 500 (relation "objects" does not exist)
Fix 1: 500 (same error - frontend fix insufficient)
Fix 2: 400 (new error - storage working, database failing)
Fix 3: 400 (same error - all permissions granted)
```

**Interpretation**:
- 500 → 400 = Progress (server error → client error)
- Persistent 400 = Permission/policy issue, not infrastructure
- Fix 2 resolved storage layer completely
- Fix 3 granted all table permissions but error persists

### Comparison with Storage Success

**Storage Upload Flow** (WORKING ✅):
```
1. User uploads file
2. Storage API validates permissions
3. Storage API checks RLS on storage.objects
4. INSERT succeeds with admin role
5. File saved to S3
```

**Database Insert Flow** (FAILING ❌):
```
1. User triggers addRecord()
2. Supabase client sends INSERT request
3. PostgreSQL validates JWT
4. RLS policies evaluated for admin role
5. INSERT fails with 400 error
```

**Critical Difference**: Storage uses Supabase Storage API (different auth path), database uses PostgREST API (RLS path)

---

## Code Path Trace

### Upload Initiation
```typescript
// src/components/you/medical/DocumentUploadDialog.tsx
const handleUpload = async () => {
  // 1. Upload file to storage
  const filePath = await uploadDocument(selectedFile);  // ← This works ✅

  // 2. Create database record
  await addRecord({  // ← This fails ❌
    type: 'other',
    title: selectedFile.name,
    file_url: filePath,
    file_name: selectedFile.name,
    file_size: selectedFile.size
  });
};
```

### Database Insert
```typescript
// src/contexts/MedicalContext.tsx:133-153
const addRecord = async (record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>) => {
  if (!user?.id) return;  // Auth check passes

  try {
    const { data, error } = await supabase
      .from('medical_records')  // Table exists, permissions granted
      .insert({ ...record, user_id: user.id })  // user_id = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"
      .select()
      .single();

    if (error) throw error;  // ← Error thrown here

    // Never reached...
  } catch (err) {
    console.error('Error adding medical record:', err);  // ← LINE 149
    toast.error('Failed to add medical record');
    throw err;
  }
};
```

### RLS Policy Evaluation (Theoretical)
```sql
-- PostgreSQL evaluates this on INSERT:
CREATE POLICY "Users can create own medical records"
    ON medical_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Expected evaluation:
-- auth.uid() = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a" (from JWT sub claim)
-- user_id = "21a2151a-cd37-41d5-a1c7-124bb05e7a6a" (from INSERT data)
-- Result: TRUE (should allow INSERT)
-- Actual result: FALSE? (400 error)
```

---

## Comparison with Working Cases

### Other Tables Using Admin Role
**Question**: Do other tables work with admin role INSERT?

**Need to Test**:
- Try inserting into `expenses` table with admin role
- Try inserting into `budgets` table with admin role
- Compare RLS policies between working and failing tables

### Regular User (Authenticated Role)
**Question**: Would this work with `role: "authenticated"` instead of `role: "admin"`?

**Cannot Test Without**:
- Changing JWT role claim in Supabase Auth
- Or creating new test user with authenticated role

### Storage Object Policies vs Table Policies
**Working Storage Policy Pattern** (from diagnostic queries):
```sql
-- Storage has 14 RLS policies
-- Some may use different auth mechanisms
-- Need to examine policy definitions
```

**Failing Table Policy Pattern**:
```sql
-- All 4 medical_records policies use auth.uid()
-- Consistent pattern across SELECT, INSERT, UPDATE, DELETE
-- Same pattern as other tables (expenses, budgets)
```

---

## Database State Verification

### Tables Confirmed Existing
```
storage schema (9 tables):
- buckets
- migrations
- objects
- s3_multipart_uploads
- s3_multipart_uploads_parts
- hooks
- http_request_queue
- decrypted_secrets
- secrets

public schema (includes):
- medical_records ← Target table
- medical_medications
- medical_emergency_info
- profiles
- expenses
- budgets
```

### RLS Policies Confirmed Active
```
medical_records policies (4):
1. "Users can view own medical records" - FOR SELECT
2. "Users can create own medical records" - FOR INSERT ← Relevant
3. "Users can update own medical records" - FOR UPDATE
4. "Users can delete own medical records" - FOR DELETE

storage.objects policies (14):
- Multiple policies for different operations
- At least some allow admin role (evidenced by working upload)
```

### Search Path Confirmed Configured
```sql
authenticated role: public, storage, extensions
anon role: public, storage, extensions
service_role: public, storage, extensions
admin role: (inherits from authenticated via GRANT)
```

---

## Summary for Handoff

### What Works ✅
- File upload to storage (storage.objects INSERT succeeds)
- All infrastructure exists (tables, buckets, policies)
- All permissions granted (storage + public schemas)
- JWT validation (no auth errors)
- Frontend schema restriction removed

### What Doesn't Work ❌
- Database INSERT into medical_records table
- HTTP 400 error (not 403 or 500)
- Error location: MedicalContext.tsx:149
- Occurs after file successfully uploaded to storage

### Most Likely Issue Areas
1. **RLS Policy Compatibility**: Policies using `auth.uid()` may not recognize admin role despite `GRANT authenticated TO admin`
2. **WITH CHECK Clause**: INSERT policy's WITH CHECK may be failing in unexpected way
3. **Hidden Dependencies**: Functions, triggers, or sequences requiring additional admin permissions
4. **Role Evaluation Timing**: PostgreSQL may evaluate role membership differently for RLS vs table permissions

### Least Likely Issue Areas
1. Infrastructure missing (all verified to exist)
2. Table permissions (all granted and verified)
3. Frontend code (same code works for storage)
4. JWT validation (token valid, no auth errors)

---

## Questions for Next Developer

### Critical Questions to Investigate
1. **Does `auth.uid()` work with admin role in RLS policies?**
   - Test: Create simple table with admin INSERT
   - Test: Check if auth.uid() returns correct value for admin role
   - Document: Compare with authenticated role behavior

2. **What causes HTTP 400 specifically?**
   - Test: Get detailed error message from Supabase logs
   - Check: PostgreSQL logs for RLS policy evaluation
   - Verify: What constraint/policy is failing

3. **Why does storage work but database fails?**
   - Compare: Storage RLS policies vs medical_records RLS policies
   - Test: Does storage use different auth mechanism?
   - Check: Are there differences in how admin role is evaluated?

### Diagnostic Tests to Run
1. **Test INSERT with authenticated role**
   - Change JWT to use `role: "authenticated"`
   - Attempt same upload
   - Compare results

2. **Test INSERT on different table**
   - Try inserting into `expenses` with admin role
   - Same user_id, same pattern
   - Does it work or fail?

3. **Check Supabase logs**
   - View PostgREST logs during failed INSERT
   - Look for RLS policy evaluation details
   - Check for constraint violations

4. **Test auth.uid() directly**
   - Run SQL query: `SELECT auth.uid()` as admin role
   - Verify it returns expected user_id
   - Compare with authenticated role

5. **Examine storage RLS policies**
   - Get full policy definitions for storage.objects
   - Compare with medical_records policies
   - Identify pattern differences

### Permissions to Verify
1. **Function permissions**
   - Does admin role have EXECUTE on auth.uid()?
   - Does admin role have EXECUTE on gen_random_uuid()?
   - Are there other functions involved?

2. **Trigger permissions**
   - Are there triggers on medical_records INSERT?
   - Does admin role have permissions on trigger functions?

3. **Foreign key permissions**
   - medical_records.user_id REFERENCES auth.users(id)
   - Does admin role have SELECT on auth.users?

---

## Related Files

### SQL Fix Files Created
- `docs/sql-fixes/fix_admin_storage_permissions.sql` - Storage permissions (applied ✅)
- `docs/sql-fixes/fix_admin_public_tables_permissions.sql` - Public schema permissions (applied ✅)
- `docs/sql-fixes/fix_storage_search_path.sql` - Search path configuration (applied ✅)
- `docs/sql-fixes/check_search_path.sql` - Diagnostic queries

### Migration Files
- `docs/sql-fixes/20250830142640_add_medical_records.sql` - Original medical tables schema with RLS policies

### Frontend Files
- `src/integrations/supabase/client.ts` - Modified (commit 9c8294f2)
- `src/components/you/medical/DocumentUploadDialog.tsx` - Upload component
- `src/contexts/MedicalContext.tsx` - Error location (line 149)

---

**Analysis Complete**
**All Known Fixes Applied and Verified**
**Issue Persists - Ready for Fresh Investigation**

**Document Created**: December 27, 2025
**For**: Handoff to another developer
**Status**: Complete technical analysis without proposed solutions
