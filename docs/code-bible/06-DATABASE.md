# 06 - Database Documentation

**Purpose:** Supabase/PostgreSQL schema, RLS policies, and query patterns.

---

## Technology Stack

| Component | Purpose |
|-----------|---------|
| Supabase | Managed PostgreSQL + Auth + Storage |
| PostgreSQL | Relational database |
| Row Level Security (RLS) | Data isolation per user |
| Supabase Auth | JWT-based authentication |

---

## Database Configuration

### Connection

```python
# Backend: Supabase client initialization
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
```

### Environment Variables

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Frontend (public, read-only)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## Core Tables

### `profiles` Table

**CRITICAL:** Uses `id` column, NOT `user_id`

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,                    -- Use 'id' NOT 'user_id'
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

```python
# CORRECT
response = supabase.from_('profiles').select('*').eq('id', user_id).execute()

# WRONG - Will error
response = supabase.from_('profiles').select('*').eq('user_id', user_id).execute()
```

---

### `calendar_events` Table

```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
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

---

### `expenses` Table

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

---

### `budgets` Table

```sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period TEXT NOT NULL,                   -- 'monthly', 'weekly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `trips` Table

```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

---

### `fuel_log` Table

```sql
CREATE TABLE fuel_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    gallons DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    location TEXT,
    odometer INTEGER,
    mpg DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `maintenance_records` Table

```sql
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

---

### `pam_conversations` Table

```sql
CREATE TABLE pam_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT,
    status TEXT DEFAULT 'active',           -- 'active', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `pam_messages` Table

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

---

### `pam_savings_events` Table

```sql
CREATE TABLE pam_savings_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount_saved DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    event_type TEXT,                        -- 'gas', 'campground', 'route', 'other'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Social/Community Tables

### `posts` Table

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
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

### `comments` Table

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `likes` Table

```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

---

## Storage Tables

### `storage_items` Table

```sql
CREATE TABLE storage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    category_id UUID,
    location_id UUID,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `storage_categories` Table

```sql
CREATE TABLE storage_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `storage_locations` Table

```sql
CREATE TABLE storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Column Name Quick Reference

| Table | Column Name | Notes |
|-------|-------------|-------|
| `profiles` | **`id`** | NOT user_id |
| `calendar_events` | `user_id` | Standard |
| `expenses` | `user_id` | Standard |
| `budgets` | `user_id` | Standard |
| `trips` | `user_id` | Standard |
| `fuel_log` | `user_id` | Standard |
| `maintenance_records` | `user_id` | Standard |
| `pam_conversations` | `user_id` | Standard |
| `pam_savings_events` | `user_id` | Standard |
| `posts` | `user_id` | Standard |
| `comments` | `user_id` | Standard |
| `likes` | `user_id` | Standard |
| `storage_items` | `user_id` | Standard |
| `storage_categories` | `user_id` | Standard |
| `storage_locations` | `user_id` | Standard |

---

## Row Level Security (RLS)

### Purpose

RLS ensures users can only access their own data at the database level.

### Policy Patterns

**Basic User Isolation:**

```sql
-- Users can only see their own data
CREATE POLICY user_isolation ON expenses
FOR ALL
USING (auth.uid() = user_id);
```

**Profiles Table (uses `id`):**

```sql
-- Special case: profiles uses 'id' not 'user_id'
CREATE POLICY user_own_profile ON profiles
FOR ALL
USING (auth.uid() = id);
```

**Admin Override:**

```sql
-- Admin can access all data
CREATE POLICY admin_access ON expenses
FOR ALL
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

### Common RLS Policies

```sql
-- Enable RLS on table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see only their data
CREATE POLICY "Users can view own expenses"
ON expenses FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create their own records
CREATE POLICY "Users can insert own expenses"
ON expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can modify their own records
CREATE POLICY "Users can update own expenses"
ON expenses FOR UPDATE
USING (auth.uid() = user_id);

-- DELETE: Users can delete their own records
CREATE POLICY "Users can delete own expenses"
ON expenses FOR DELETE
USING (auth.uid() = user_id);
```

### RLS with PostgreSQL Roles

**CRITICAL:** JWT claims (role: "admin") != PostgreSQL roles

```sql
-- Policy must use TO clause for PostgreSQL roles
CREATE POLICY calendar_access ON calendar_events
FOR ALL
TO authenticated, anon   -- PostgreSQL roles, not JWT claims
USING (auth.uid() = user_id);
```

---

## Query Patterns

### Select with User Filtering

```python
# Python (Backend)
response = supabase.from_('expenses') \
    .select('*') \
    .eq('user_id', user_id) \
    .execute()

expenses = response.data
```

```typescript
// TypeScript (Frontend)
const { data, error } = await supabase
  .from('expenses')
  .select('*')
  .eq('user_id', userId);
```

### Insert with User ID

```python
# Python (Backend)
expense_data = {
    "user_id": user_id,
    "amount": 50.00,
    "category": "fuel",
    "description": "Shell Station",
    "date": "2025-01-15"
}

response = supabase.from_('expenses') \
    .insert(expense_data) \
    .execute()
```

### Update with Conditions

```python
response = supabase.from_('expenses') \
    .update({"amount": 55.00}) \
    .eq('id', expense_id) \
    .eq('user_id', user_id) \
    .execute()
```

### Delete with User Check

```python
response = supabase.from_('expenses') \
    .delete() \
    .eq('id', expense_id) \
    .eq('user_id', user_id) \
    .execute()
```

### Aggregation Queries

```python
# Get total spending by category
response = supabase.from_('expenses') \
    .select('category, amount') \
    .eq('user_id', user_id) \
    .gte('date', start_date) \
    .lte('date', end_date) \
    .execute()

# Aggregate in Python
from collections import defaultdict
totals = defaultdict(float)
for expense in response.data:
    totals[expense['category']] += float(expense['amount'])
```

### Join Queries

```python
# Get messages with conversation info
response = supabase.from_('pam_messages') \
    .select('*, pam_conversations(title, status)') \
    .eq('conversation_id', conversation_id) \
    .execute()
```

---

## Migrations

### Creating a Migration

```sql
-- docs/sql-fixes/add_new_column.sql

-- Add column to existing table
ALTER TABLE expenses ADD COLUMN receipt_url TEXT;

-- Create index for performance
CREATE INDEX idx_expenses_category ON expenses(category);
```

### Running Migrations

1. Open Supabase SQL Editor
2. Paste migration SQL
3. Execute
4. Update DATABASE_SCHEMA_REFERENCE.md
5. Commit changes

### Migration Best Practices

- Always create migrations in `docs/sql-fixes/`
- One migration per file
- Use descriptive file names
- Test on staging first
- Update documentation after applying

---

## Database Indexes

### Recommended Indexes

```sql
-- User lookup (most common query pattern)
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_fuel_log_user ON fuel_log(user_id);

-- Date range queries
CREATE INDEX idx_expenses_date ON expenses(user_id, date);
CREATE INDEX idx_trips_dates ON trips(user_id, start_date, end_date);

-- Category filtering
CREATE INDEX idx_expenses_category ON expenses(user_id, category);

-- Full-text search
CREATE INDEX idx_posts_content ON posts USING gin(to_tsvector('english', content));
```

---

## Database Functions

### Auto-Update Timestamp

```sql
-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_expenses_timestamp
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Calculate Monthly Totals

```sql
CREATE OR REPLACE FUNCTION get_monthly_totals(p_user_id UUID, p_month DATE)
RETURNS TABLE (category TEXT, total DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.category,
        SUM(e.amount) as total
    FROM expenses e
    WHERE e.user_id = p_user_id
    AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', p_month)
    GROUP BY e.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Backup and Recovery

### Supabase Backups

- **Automatic:** Daily backups (retained based on plan)
- **Point-in-time:** Available on Pro plan
- **Manual:** Export via Supabase dashboard

### Export Data

```bash
# Export table to CSV
supabase db dump --data-only --table expenses > expenses_backup.csv
```

### Restore Data

```bash
# Restore from backup
psql -d postgres://... -f backup.sql
```

---

## Performance Tips

### Query Optimization

1. **Use indexes** for frequently queried columns
2. **Limit result sets** with `.limit()`
3. **Select only needed columns** instead of `*`
4. **Use pagination** for large datasets

```python
# Good: Select specific columns with limit
response = supabase.from_('expenses') \
    .select('id, amount, category, date') \
    .eq('user_id', user_id) \
    .order('date', desc=True) \
    .limit(50) \
    .execute()
```

### Connection Pooling

```python
# Backend uses connection pooling via Supabase
# No manual pooling needed - handled by Supabase client
```

### Caching Strategy

```python
# Cache frequently accessed data in Redis
async def get_user_profile(user_id: str) -> dict:
    cache_key = f"user_profile:{user_id}"

    # Check cache first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Fetch from database
    response = supabase.from_('profiles') \
        .select('*') \
        .eq('id', user_id) \
        .single() \
        .execute()

    # Cache for 5 minutes
    await redis.set(cache_key, json.dumps(response.data), ex=300)

    return response.data
```

---

## Troubleshooting

### Common Issues

**1. "Column not found" error**

```python
# Check DATABASE_SCHEMA_REFERENCE.md for correct column names
# profiles uses 'id', not 'user_id'
```

**2. RLS blocking queries**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'expenses';
```

**3. Slow queries**

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM expenses
WHERE user_id = 'xxx'
AND date > '2025-01-01';
```

**4. Foreign key violations**

```sql
-- Check foreign key constraints
SELECT * FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';
```

---

## Quick Reference

### File Locations

| Purpose | Location |
|---------|----------|
| Schema Reference | `docs/DATABASE_SCHEMA_REFERENCE.md` |
| Migration SQL | `docs/sql-fixes/*.sql` |
| Backend Client | `backend/app/services/database.py` |
| Frontend Client | `src/integrations/supabase/client.ts` |

### Common Commands

```bash
# Generate TypeScript types from schema
supabase gen types typescript --project-id xxx > src/types/database.types.ts

# Run local Supabase
supabase start

# Push migrations
supabase db push
```
