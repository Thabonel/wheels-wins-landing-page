# PAM Database Permissions Fix - Instructions

## 🎯 What This Migration Fixes

This migration resolves all the critical database permission issues that were preventing PAM from launching:

### ✅ **Issues Resolved**:
1. **403 Forbidden on trip_templates** - Fixed RLS policies to allow authenticated users to read public templates
2. **Infinite recursion in group_trip_participants** - Completely rewritten non-recursive policies
3. **Missing tables** - Created `affiliate_sales`, `user_wishlists`, and all PAM-specific tables
4. **PAM service role permissions** - Added comprehensive service role access for all PAM operations
5. **Performance optimization** - Added strategic indexes for PAM functionality

## 🚀 How to Apply the Migration

### Method 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250729200000-fix-pam-database-permissions.sql`
4. Click **Run** to execute the migration
5. Verify completion by running: `SELECT * FROM verify_pam_permissions()`

### Method 2: Supabase CLI
```bash
# Navigate to your project root
cd /path/to/wheels-wins-landing-page

# Apply the migration
supabase db push

# Or apply this specific migration
supabase migration up --include-all
```

### Method 3: Direct Database Connection
```bash
# Connect to your database and run the migration file
psql "your-supabase-connection-string" -f supabase/migrations/20250729200000-fix-pam-database-permissions.sql
```

## 🔍 Verification Steps

After applying the migration, verify everything is working:

### 1. Run the Verification Function
```sql
SELECT * FROM verify_pam_permissions();
```

**Expected Output**: All tests should return `PASS` status.

### 2. Test PAM Functionality
1. **Trip Templates Access**: 
   - Visit your app and try to access trip planning features
   - Should no longer show 403 Forbidden errors

2. **PAM Chat**:
   - Test PAM conversation functionality
   - Memory and context should persist properly

3. **Voice Features**:
   - Test voice interaction with PAM
   - Should work with the enhanced TTS system

### 3. Check Database Tables
Verify these tables now exist:
```sql
-- Check PAM-specific tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'pam_%';

-- Check previously missing tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('affiliate_sales', 'user_wishlists', 'wishlist_items');
```

## 📊 What Was Created

### New PAM Tables:
- `pam_conversation_memory` - Stores PAM chat history and context
- `pam_feedback` - User feedback on PAM responses
- `pam_user_context` - Personalized user context for PAM
- `pam_analytics` - PAM usage and performance tracking

### Fixed RLS Policies:
- **trip_templates**: Now allows authenticated users to read public templates
- **group_trip_participants**: Non-recursive policies prevent infinite loops
- **All PAM tables**: Proper user isolation with service role access

### Service Role Permissions:
- Full access to all PAM tables for backend operations
- Read access to user profiles, settings, trips, and expenses for personalization
- Execute permissions on PAM utility functions

### Performance Indexes:
- Strategic indexes on all PAM tables for fast query performance
- Enhanced trip_templates indexes for public template discovery
- User-session based indexes for quick context retrieval

## 🛠️ Maintenance Functions

The migration includes helpful maintenance functions:

### Clean Up Expired PAM Memory
```sql
SELECT cleanup_expired_pam_memory();
```

### Update Template Usage Count
```sql
SELECT increment_template_usage('template-uuid-here');
```

## 🚨 Troubleshooting

### If you see "policy already exists" errors:
This is normal - the migration uses `IF EXISTS` clauses to safely handle existing policies.

### If verification shows FAIL status:
1. Check the Supabase logs for detailed error messages
2. Ensure you have sufficient database permissions
3. Try running individual sections of the migration

### If PAM still shows 403 errors:
1. Verify the migration completed successfully
2. Check that your frontend is using authenticated requests
3. Ensure your Supabase service role key is correct in backend environment

## ✅ Success Indicators

You'll know the migration worked when:
- ✅ No more 403 Forbidden errors on trip templates
- ✅ PAM conversation works smoothly without recursion errors
- ✅ Voice features work with the enhanced TTS system
- ✅ All verification tests pass
- ✅ Backend logs show successful database operations

## 📝 Next Steps

After applying this migration:
1. **Test PAM thoroughly** - Try all voice and chat features
2. **Monitor performance** - Check database query performance
3. **Review analytics** - Monitor PAM usage through the new analytics table
4. **Launch PAM** - Your database permissions are now properly configured!

---

**🎉 PAM is now ready for launch with full database permissions!**