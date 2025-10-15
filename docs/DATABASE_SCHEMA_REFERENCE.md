# PAM Database Schema - THE SOURCE OF TRUTH

**Last Updated:** January 15, 2025
**Purpose:** Single source of truth for ALL database table schemas
**Rule:** Read this BEFORE writing ANY database queries

---

## ⚠️ CRITICAL RULES

1. **ALWAYS read this document before writing database queries**
2. **Use ACTUAL column names listed here, not what you think they should be**
3. **If unsure, check Supabase dashboard to verify schema**
4. **Update this document immediately when schema changes**

---

## Core Tables

### `profiles` table
**CRITICAL:** Uses `id` column, NOT `user_id`

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,                    -- ⚠️ Use 'id' NOT 'user_id'
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    nickname TEXT,
    profile_image_url TEXT,
    partner_name TEXT,
    partner_email TEXT,
    partner_profile_image_url TEXT,
    vehicle_type TEXT,
    vehicle_make_model TEXT,
    vehicle_image_url TEXT,
    fuel_type TEXT,
    towing TEXT,
    second_vehicle TEXT,
    max_driving TEXT,
    camp_types TEXT,
    accessibility TEXT,
    pets TEXT,
    travel_style TEXT,
    region TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    preferred_units TEXT DEFAULT 'metric',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);  // Use 'id' NOT 'user_id'

// ❌ WRONG - Will return 400 error
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId);  // user_id column does NOT exist
```

**References:**
- `id` → `auth.users(id)` (1:1 relationship)

---

### `calendar_events` table
**Uses:** `user_id` column (this one IS correct)

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ This table uses 'user_id'
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,        -- ⚠️ Use start_date NOT 'date'
    end_date TIMESTAMPTZ NOT NULL,          -- ⚠️ Use end_date NOT 'time'
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    event_type TEXT NOT NULL DEFAULT 'personal',
    location_name TEXT,
    reminder_minutes INTEGER[] DEFAULT ARRAY[15],
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('calendar_events')
  .select('*')
  .eq('user_id', userId);  // This table uses 'user_id'
```

**References:**
- `user_id` → `auth.users(id)`

---

### `expenses` table

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    location TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `budgets` table

```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL,                   -- 'monthly', 'weekly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('budgets')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `trips` table

```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    distance_miles DECIMAL(10,2),
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    status TEXT DEFAULT 'planned',          -- 'planned', 'active', 'completed'
    notes TEXT,
    route_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `fuel_log` table

```sql
CREATE TABLE fuel_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    date DATE NOT NULL,
    gallons DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    location TEXT,
    odometer INTEGER,
    mpg DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('fuel_log')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `maintenance_records` table

```sql
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    task TEXT NOT NULL,
    date DATE NOT NULL,
    mileage INTEGER,
    cost DECIMAL(10,2),
    location TEXT,
    notes TEXT,
    next_due_date DATE,
    next_due_mileage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('maintenance_records')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `pam_conversations` table

```sql
CREATE TABLE pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    title TEXT,
    status TEXT DEFAULT 'active',           -- 'active', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('pam_conversations')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `pam_messages` table

```sql
CREATE TABLE pam_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    role TEXT NOT NULL,                     -- 'user', 'assistant'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('pam_messages')
  .select('*')
  .eq('conversation_id', conversationId);
```

**References:**
- `conversation_id` → `pam_conversations(id)`

---

### `pam_savings_events` table

```sql
CREATE TABLE pam_savings_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    amount_saved DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    event_type TEXT,                        -- 'gas', 'campground', 'route', 'other'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('pam_savings_events')
  .select('*')
  .eq('user_id', userId);
```

**References:**
- `user_id` → `auth.users(id)`

---

## Social/Community Tables

### `posts` table

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    content TEXT NOT NULL,
    images TEXT[],
    location_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    tags TEXT[],
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `comments` table

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**References:**
- `post_id` → `posts(id)`
- `user_id` → `auth.users(id)`

---

### `likes` table

```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

**References:**
- `post_id` → `posts(id)`
- `user_id` → `auth.users(id)`

---

## Storage Tables

### `storage_items` table

```sql
CREATE TABLE storage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    name TEXT NOT NULL,
    category_id UUID,
    location_id UUID,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**References:**
- `user_id` → `auth.users(id)`
- `category_id` → `storage_categories(id)`
- `location_id` → `storage_locations(id)`

---

### `storage_categories` table

```sql
CREATE TABLE storage_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `storage_locations` table

```sql
CREATE TABLE storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**References:**
- `user_id` → `auth.users(id)`

---

## Quick Reference: Which Column to Use?

| Table | Column Name | Notes |
|-------|-------------|-------|
| `profiles` | **`id`** | ⚠️ NOT user_id! |
| `calendar_events` | `user_id` | ✅ |
| `expenses` | `user_id` | ✅ |
| `budgets` | `user_id` | ✅ |
| `trips` | `user_id` | ✅ |
| `fuel_log` | `user_id` | ✅ |
| `maintenance_records` | `user_id` | ✅ |
| `pam_conversations` | `user_id` | ✅ |
| `pam_savings_events` | `user_id` | ✅ |
| `posts` | `user_id` | ✅ |
| `comments` | `user_id` | ✅ |
| `likes` | `user_id` | ✅ |
| `storage_items` | `user_id` | ✅ |
| `storage_categories` | `user_id` | ✅ |
| `storage_locations` | `user_id` | ✅ |

---

## Code Templates

### Profiles Query (Use `id`)
```typescript
// CRITICAL: profiles table uses 'id' NOT 'user_id'
// If you change this, PAM breaks. Don't touch it.
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)  // id, not user_id!
  .single();
```

### All Other Tables (Use `user_id`)
```typescript
// Most tables use 'user_id'
const { data } = await supabase
  .from('calendar_events')  // or expenses, trips, etc.
  .select('*')
  .eq('user_id', userId);
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Using user_id on profiles
```typescript
// This will return 400 error
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId);  // user_id column does NOT exist
```

### ✅ CORRECT: Using id on profiles
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);
```

---

## How to Verify Schema

If you're unsure about a table's schema:

1. **Check this document first**
2. **If not listed, check Supabase dashboard:**
   - Go to: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/editor
   - Select the table
   - Click "View" to see actual columns
3. **Update this document** with the correct schema

---

## Schema Change Protocol

When you need to change a table schema:

1. **Create migration SQL in `docs/sql-fixes/`**
2. **Run migration in Supabase SQL editor**
3. **Update this document** with new schema
4. **Update all queries** in codebase
5. **Test thoroughly** before committing
6. **Commit with clear message** explaining the change

---

## Related Documents

- **Migration SQL Files:** `/docs/sql-fixes/`
- **Backend Database Access:** `/backend/app/services/database.py`
- **Supabase Client:** `/src/integrations/supabase/client.ts`

---

**Remember:** This document is THE SOURCE OF TRUTH. When in doubt, trust this document over memory or assumptions.
