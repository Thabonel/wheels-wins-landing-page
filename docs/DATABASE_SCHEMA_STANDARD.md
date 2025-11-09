# Database Schema Standards

**Last Updated:** October 14, 2025
**Purpose:** Prevent recurring id/user_id confusion that caused 9+ months of bugs

---

## Critical Standard: User Identification

### ✅ ALWAYS Use `id` (Not `user_id`)

The `profiles` table uses **`id UUID`** as the primary key, matching Supabase `auth.users` convention.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  ...
);
```

### 🚫 NEVER Use `user_id` for Primary Key

Do **NOT** create a separate `user_id` column in the profiles table. This causes confusion and "invalid input syntax for type bigint" errors.

---

## Code Standard

### Backend (Python + Supabase)

✅ **CORRECT:**
```python
profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
```

❌ **WRONG:**
```python
profile = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
# This causes: invalid input syntax for type bigint: "uuid-string"
```

### Frontend (TypeScript + Supabase)

✅ **CORRECT:**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
```

❌ **WRONG:**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId);  // Wrong column name!
```

---

## Why This Matters

### The Problem (2024-2025)
For 9+ months, the codebase had inconsistent queries:
- Some files used `.eq("id", user_id)` ✅
- Some files used `.eq("user_id", user_id)` ❌
- Result: Mysterious errors, profile loading failures, PAM couldn't access user location

### The Error
```
{'message': 'invalid input syntax for type bigint: "21a2151a-cd37-41d5-a1c7-124bb05e7a6a"',
 'code': '22P02'}
```

This happens when querying non-existent `user_id` column or when database has conflicting schema.

### The Fix (October 14, 2025)
- ✅ Standardized on `id` everywhere (12 files updated)
- ✅ Added database migration with validation function
- ✅ Added backend startup schema validation
- ✅ Added integration test to prevent regression
- ✅ Documented standard (this file)

---

## Validation

### Database Level
Run this to check schema:
```sql
SELECT * FROM validate_profiles_has_id_column();
```

Expected result:
```
is_valid | error_message
---------|---------------------------
true     | profiles table schema is correct
```

### Backend Level
Schema validation runs automatically on backend startup:
```
✅ Database schema validation completed
```

If validation fails:
```
⚠️ Schema validation error: [error details]
```

### Test Level
Run integration test:
```bash
cd backend
pytest tests/integration/test_profile_loading.py -v
```

---

## Files Changed (October 14, 2025)

All these files now use `.eq("id", user_id)`:

**Backend:**
1. `backend/app/services/pam/tools/load_user_profile.py`
2. `backend/app/services/pam/tools/profile/export_data.py`
3. `backend/app/services/pam/tools/admin/add_knowledge.py`
4. `backend/app/api/v1/debug_profile_integration.py`
5. `backend/app/nodes/memory_node.py` (4 instances)
6. `backend/app/services/pam/nodes/memory_node.py` (4 instances)
7. `backend/app/services/pam/graph_enhanced_orchestrator.py`
8. `backend/database_direct_access.py` (2 instances)

**Database:**
- `supabase/migrations/20251014000001-standardize-profiles-schema.sql`
- Foundation migration: `supabase/migrations/01_foundation.sql` (already correct)

**Tests:**
- `backend/tests/integration/test_profile_loading.py`

**Infrastructure:**
- `backend/app/core/schema_validator.py` (new file)
- `backend/app/main.py` (added startup validation)

---

## RLS Policies

Row Level Security policies use `id` (not `user_id`):

```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);  -- Uses 'id'

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);  -- Uses 'id'
```

---

## Migration Guide

If you find code using `user_id` with profiles table:

1. **Search:** `grep -r '\.table("profiles").*\.eq("user_id"' backend/`
2. **Replace:** Change `.eq("user_id", user_id)` → `.eq("id", user_id)`
3. **Test:** Run `pytest tests/integration/test_profile_loading.py`
4. **Verify:** Check backend logs for schema validation success

---

## Reference

- **Migration:** `supabase/migrations/20251014000001-standardize-profiles-schema.sql`
- **Validator:** `backend/app/core/schema_validator.py`
- **Test:** `backend/tests/integration/test_profile_loading.py`
- **Foundation:** `supabase/migrations/01_foundation.sql` (line 10: `id UUID PRIMARY KEY`)

---

## Contact

If you encounter id/user_id issues:
1. Check this document
2. Run schema validation
3. Check migration was applied
4. Review test failures
5. Update code to use `id` (not `user_id`)

**Remember:** `profiles.id` is the standard. Always. No exceptions.
