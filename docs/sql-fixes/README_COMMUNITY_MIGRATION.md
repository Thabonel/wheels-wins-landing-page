# Community Tips Migration Instructions

## Quick Status Check

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql
2. Run this query to check if tables exist:

```sql
-- Copy and paste from: verify_community_tables.sql
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'community_tips'
) as community_tips_exists;
```

## If Tables Don't Exist - Apply Migration

### Method 1: Supabase SQL Editor (Recommended)

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/sql
2. Copy entire contents of: `docs/sql-fixes/apply_community_tables.sql`
3. Paste into SQL Editor
4. Click "Run" button
5. Verify success (should see "Success. No rows returned")

### Method 2: Supabase CLI (If Authenticated)

```bash
# From project root
supabase db push
```

### Method 3: Manual Table-by-Table (If Above Fail)

If the full migration fails, you can run sections individually:

1. **First**: Tables (lines 10-92 of apply_community_tables.sql)
2. **Second**: Indexes (lines 95-118)
3. **Third**: RLS Policies (lines 121-181)
4. **Fourth**: Functions & Triggers (lines 184-253)
5. **Fifth**: Grants (lines 351-368)

## What Gets Created

### Tables
- `community_tips` - User-contributed tips (main table)
- `tip_usage_log` - Tracks when PAM uses tips
- `user_contribution_stats` - Aggregated contribution metrics

### Database Functions
- `search_community_tips(p_query, p_category, p_limit)` - Full-text search
- `get_user_contribution_stats(p_user_id)` - User stats
- `get_community_stats()` - Overall community metrics

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only modify their own tips
- Service role has full access for PAM
- Authenticated users can view active tips

### Features
- Full-text search on title/content
- Geo-location support (optional)
- Tags for categorization
- Reputation/badge system
- Automatic stat tracking via triggers

## Verification

After applying migration, run verify_community_tables.sql to confirm:
- All 3 tables should return `true`
- If any return `false`, re-run the corresponding section

## Troubleshooting

**Error: "relation already exists"**
- Tables partially created, check verify script to see which ones exist
- Only run missing table sections

**Error: "function already exists"**
- Functions partially created, safe to skip or use `CREATE OR REPLACE`

**Error: "permission denied"**
- Ensure you're logged in as database admin
- Check RLS policies aren't blocking your user
