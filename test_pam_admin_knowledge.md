# PAM Admin Knowledge System - Verification Test

**Date:** October 8, 2025
**Purpose:** Verify database tables exist and admin tools are operational

## Quick Test (30 seconds)

### Via PAM Chat Interface

1. **Log in as admin** at: https://wheels-wins-staging.netlify.app
2. **Open PAM chat**
3. **Send:** `PAM, remember that May to August is the best time to travel in Port Headland`
4. **Expected:** `I've learned: 'Port Headland Best Season'. I'll remember this...`

### Verification

If PAM responds successfully, tables exist and system works ✅

If PAM errors or says "cannot access database", tables don't exist ❌

## What This Tests

1. Database tables exist (pam_admin_knowledge, pam_knowledge_usage_log)
2. add_knowledge tool can write
3. search_knowledge tool can read
4. Security validation works
5. PAM integration works

## Full Test Results

### ✅ Expected if Tables Exist
- add_knowledge returns `{"success": True, "knowledge_id": "uuid"}`
- search_knowledge finds stored knowledge
- Malicious content is blocked

### ❌ Expected if Tables Missing
- Error: `relation "pam_admin_knowledge" does not exist`
- Backend logs show SQL errors
- PAM says "I encountered an error"

## Troubleshooting

**Error: "relation does not exist"**
→ Run migration: `docs/sql-fixes/pam_admin_memory.sql` in Supabase

**Error: "permission denied"**  
→ Check RLS policies in Supabase dashboard

## Success Criteria

✅ System operational if:
- Can store knowledge via natural language
- Can retrieve knowledge in responses
- Security blocks malicious input
- No database errors

---

**Status:** Ready for testing
**Last Updated:** October 8, 2025
