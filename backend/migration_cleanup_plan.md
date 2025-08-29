# Migration Cleanup Plan - Wheels & Wins

## Current State
- **84 migration files** (excessive duplication)
- **Multiple conflicts** in table schemas
- **RLS policy duplicates** across 15+ files
- **Inconsistent foreign keys** and naming

## Cleanup Strategy

### Phase 1: Archive Existing Migrations
Move all current migrations to `supabase/migrations/archive/` to preserve history.

### Phase 2: Create Consolidated Migrations

#### Core Migrations to Keep (Consolidated):

1. **`01_foundation.sql`** - Basic user and auth setup
   - Profiles table (standardized schema)
   - User settings
   - Basic RLS policies

2. **`02_trip_planning.sql`** - Trip planning system
   - user_trips, trip_routes, trip_waypoints
   - trip_templates, trip_expenses
   - PostGIS spatial support

3. **`03_vehicle_management.sql`** - Vehicle and maintenance
   - vehicles table
   - maintenance_records
   - fuel_log

4. **`04_social_features.sql`** - Social platform features
   - social_posts, user_friendships, user_follows
   - social_groups, group_members
   - social_interactions, community_events

5. **`05_marketplace.sql`** - Commerce features
   - marketplace_listings (consistent schema)
   - user_wishlists
   - affiliate_sales

6. **`06_communication.sql`** - Messaging and notifications
   - conversations, messages
   - notifications
   - user_sessions

7. **`07_calendar_events.sql`** - Calendar and scheduling
   - calendar_events (standardized schema)
   - event_participants

8. **`08_support_system.sql`** - Support and admin
   - support_tickets
   - admin_logs

9. **`09_storage_files.sql`** - File management
   - file_uploads, file_metadata
   - Storage bucket policies

10. **`10_performance_indexes.sql`** - All performance indexes
    - Consolidated from current index migration

### Conflicts to Resolve

#### 1. marketplace_listings Schema
**Chosen Standard:**
```sql
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. profiles Table Schema
**Chosen Standard:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. calendar_events Schema
**Chosen Standard:**
```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  event_type TEXT DEFAULT 'personal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Files to Remove (Archive)

#### Duplicate Table Creations:
- `20250711_create_calendar_events_table.sql`
- `20250711_clean_calendar_fix.sql`
- `20250711_simple_calendar_fix.sql`
- `20250712_create_missing_social_tables.sql`
- `20250712_fix_marketplace_schema.sql`
- `20250712_fix_all_missing_social_tables.sql`
- All UUID-named duplicate files (42+ files)

#### RLS Policy-Only Migrations:
- `20250712_fix_social_posts_permissions.sql`
- `20250712_disable_social_posts_rls_temporarily.sql`
- `20250712_ensure_admin_access.sql`
- `20250718_remove_admin_security_definer_functions.sql`
- Multiple RLS fix files

#### Superseded Migrations:
- `20250721000000-fix-database-issues.sql`
- `20250721000001-fix-profiles-table.sql`
- `20250721140000-fix-uuid-string-consistency.sql`
- Various user settings duplicate files

### Expected Results

#### Before Cleanup:
- 84 migration files
- Multiple schema conflicts
- Inconsistent table structures
- Duplicate RLS policies

#### After Cleanup:
- 10 consolidated migration files
- Consistent schema across all tables
- Single source of truth for each feature
- Proper dependency order
- No conflicting policies

### Migration Order Dependencies

1. `01_foundation.sql` - Must run first (auth foundation)
2. `02_trip_planning.sql` - Depends on profiles
3. `03_vehicle_management.sql` - Depends on profiles
4. `04_social_features.sql` - Depends on profiles
5. `05_marketplace.sql` - Depends on profiles
6. `06_communication.sql` - Depends on profiles
7. `07_calendar_events.sql` - Depends on profiles
8. `08_support_system.sql` - Depends on profiles
9. `09_storage_files.sql` - Independent
10. `10_performance_indexes.sql` - Must run last

### Implementation Steps

1. **Archive current migrations**: Move to `archive/` folder
2. **Create consolidated migrations**: 10 new files with resolved schemas
3. **Test migration sequence**: Ensure proper dependency order
4. **Validate schema consistency**: Check for remaining conflicts
5. **Update documentation**: Document final schema design

This cleanup will reduce migration complexity by ~80% while ensuring consistent, conflict-free database schema.