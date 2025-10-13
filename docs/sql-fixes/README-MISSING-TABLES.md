# Missing PAM Tables - Installation Guide

**Created:** October 9, 2025
**Purpose:** Add 9 missing database tables required by PAM tools

## Quick Summary

During the PAM tools schema audit, we discovered **9 database tables** that PAM tools reference but don't exist in the schema. This affects **13 tools** across shop, trip, social, and profile categories.

## Missing Tables

### Shop Tables (4)
- `products` - Product catalog
- `cart_items` - Shopping cart items
- `orders` - Order records
- `order_items` - Individual items in orders

### Trip Tables (2)
- `campgrounds` - RV park and campground listings
- `favorite_locations` - User's saved favorite spots

### Social Tables (3)
- `comments` - Post comments
- `post_likes` - Post like/reactions
- `shared_locations` - Real-time location sharing

### Profile Tables (1)
- `privacy_settings` - User privacy preferences

## Installation Methods

### Method 1: Via Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /Users/thabonel/Code/wheels-wins-landing-page

# Run migration
supabase db push

# Or apply specific migration
supabase migration up 20251009000000
```

### Method 2: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy contents of `create-missing-pam-tables.sql`
5. Paste and click **Run**

### Method 3: Via SQL File

```bash
# Using psql
psql $DATABASE_URL -f supabase/migrations/20251009000000-create-missing-pam-tables.sql

# Or copy from docs
psql $DATABASE_URL -f docs/sql-fixes/create-missing-pam-tables.sql
```

## What This Migration Does

1. **Creates 9 new tables** with proper constraints, indexes, and relationships
2. **Enables Row Level Security (RLS)** on all tables
3. **Creates RLS policies** for secure data access
4. **Adds updated_at triggers** for automatic timestamp updates
5. **Creates indexes** for query performance

## Affected PAM Tools

After running this migration, these 13 PAM tools will become fully functional:

### Shop Tools (5 tools)
- ✅ `search_products.py`
- ✅ `add_to_cart.py`
- ✅ `get_cart.py`
- ✅ `checkout.py`
- ✅ `track_order.py`

### Trip Tools (2 tools)
- ✅ `find_rv_parks.py`
- ✅ `save_favorite_spot.py`

### Social Tools (3 tools)
- ✅ `comment_on_post.py`
- ✅ `like_post.py`
- ✅ `share_location.py`

### Profile Tools (1 tool)
- ✅ `manage_privacy.py`

## Verification

After running the migration, verify tables were created:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'products', 'cart_items', 'orders', 'order_items',
    'campgrounds', 'favorite_locations',
    'comments', 'post_likes', 'shared_locations',
    'privacy_settings'
);

-- Should return 9 rows
```

## Testing

Test each affected tool via PAM:

```bash
# Shop tools
"PAM, search for RV accessories"
"PAM, add product X to my cart"

# Trip tools
"PAM, find RV parks near Yellowstone"
"PAM, save this campground as a favorite"

# Social tools
"PAM, comment on the latest post"
"PAM, like John's recent post"

# Profile tools
"PAM, update my privacy settings"
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop all tables (CAUTION: This deletes data!)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.favorite_locations CASCADE;
DROP TABLE IF EXISTS public.campgrounds CASCADE;
DROP TABLE IF EXISTS public.shared_locations CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.privacy_settings CASCADE;
```

## Related Documentation

- **Audit Report:** `docs/PAM_TOOLS_SCHEMA_AUDIT.md`
- **Migration File:** `supabase/migrations/20251009000000-create-missing-pam-tables.sql`
- **SQL Fixes Folder:** `docs/sql-fixes/`

## Notes

- All tables have RLS enabled for security
- Users can only access their own data (except public tables like products, campgrounds)
- Tables include proper foreign key constraints
- Indexes added for common query patterns
- Geographic data uses PostGIS GEOGRAPHY type with SRID 4326 (WGS84)

## Next Steps

After installing these tables:

1. ✅ Run the migration
2. ✅ Verify all 9 tables exist
3. ✅ Test affected PAM tools
4. ✅ Monitor logs for any issues
5. ⬜ Populate sample data for testing (optional)
6. ⬜ Update frontend UI for new features (shop, etc.)

## Questions?

See the full audit report in `docs/PAM_TOOLS_SCHEMA_AUDIT.md` for detailed information about each tool and table.
