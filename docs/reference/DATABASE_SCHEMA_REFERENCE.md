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

    -- Phase 1: Solo Traveler Community Features (Added Jan 8, 2026)
    gender_identity TEXT,                   -- Optional: Woman, Man, Non-binary, etc.
    gender_custom TEXT,                     -- Custom text when gender_identity = 'Self-describe'
    pronouns TEXT,                          -- Optional: she/her, he/him, they/them, etc.
    pronouns_custom TEXT,                   -- Custom text when pronouns = 'Self-describe'
    travel_style TEXT[],                    -- ⚠️ NOW ARRAY: ['Solo traveler', 'Open to companions', etc.]
    interests TEXT[],                       -- Activity tags: ['hiking', 'fishing', 'photography', etc.]
    content_preferences JSONB DEFAULT '{    -- Opt-in personalization settings
        "show_personalized_safety": false,
        "show_personalized_community": false,
        "share_gender_with_groups": false
    }'::jsonb,

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

**Phase 1 Fields (Solo Traveler Community Features):**

1. **`gender_identity` (TEXT, optional)**
   - Options: "Woman", "Man", "Non-binary", "Genderqueer", "Agender", "Genderfluid", "Two-Spirit", "Self-describe", "" (prefer not to say)
   - Hidden by default - user controls visibility via `content_preferences.share_gender_with_groups`
   - If "Self-describe", actual value stored in `gender_custom`

2. **`pronouns` (TEXT, optional)**
   - Options: "she/her", "he/him", "they/them", "she/they", "he/they", "any", "Self-describe", "" (prefer not to say)
   - If "Self-describe", actual value stored in `pronouns_custom`

3. **`travel_style` (TEXT[], ⚠️ CHANGED FROM TEXT TO ARRAY)**
   - Multi-select values: "Solo traveler", "Open to companions", "Traveling with partner", "Traveling with family", "Prefer privacy"
   - **Migration Note:** Existing single TEXT values were automatically migrated to single-element arrays

4. **`interests` (TEXT[], optional)**
   - Activity-based matching tags
   - Examples: "hiking", "fishing", "photography", "cycling", "rv-repair", "cooking", "kayaking", "birdwatching", "stargazing", "rockhounding", "veterans"
   - Used to recommend community groups and events

5. **`content_preferences` (JSONB, defaults to all false)**
   - Structure:
     ```json
     {
       "show_personalized_safety": false,      // Women/men-specific safety resources
       "show_personalized_community": false,   // Personalized group recommendations
       "share_gender_with_groups": false       // Allow gender-specific groups in feed
     }
     ```
   - All fields default to `false` (opt-in, not opt-out)
   - Privacy-first design

**Query Examples:**

```typescript
// Get profile with new fields
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, gender_identity, pronouns, travel_style, interests, content_preferences')
  .eq('id', userId)
  .single();

// Update gender identity (optional)
await supabase
  .from('profiles')
  .update({
    gender_identity: 'Non-binary',
    pronouns: 'they/them'
  })
  .eq('id', userId);

// Update travel style (now array)
await supabase
  .from('profiles')
  .update({
    travel_style: ['Solo traveler', 'Open to companions']
  })
  .eq('id', userId);

// Update interests
await supabase
  .from('profiles')
  .update({
    interests: ['hiking', 'photography', 'veterans']
  })
  .eq('id', userId);

// Update content preferences
await supabase
  .from('profiles')
  .update({
    content_preferences: {
      show_personalized_safety: true,
      show_personalized_community: true,
      share_gender_with_groups: false
    }
  })
  .eq('id', userId);

// Search by interests (array contains)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .contains('interests', ['hiking']);

// Search by travel style (array contains)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .contains('travel_style', ['Solo traveler']);
```

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

## Medical Tables (December 2025)

### `medical_records` table
**Primary table for medical document storage with OCR text extraction**

```sql
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    title TEXT NOT NULL,
    type TEXT NOT NULL,                     -- 'document', 'lab_result', 'prescription', etc.
    summary TEXT,
    tags TEXT[],
    test_date DATE,
    document_url TEXT,                      -- Path in Supabase Storage
    content_json JSONB,                     -- Structured data (future use)
    ocr_text TEXT,                          -- ✅ EXTRACTED TEXT for AI search (December 2025)
                                            -- Populated during upload via:
                                            -- - pdfjs-dist (PDF files)
                                            -- - Tesseract.js (image OCR)
                                            -- - Direct read (text/markdown files)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('medical_records')
  .select('*')
  .eq('user_id', userId);

// Search document contents (via ocr_text)
const { data: searchResults } = await supabase
  .from('medical_records')
  .select('*')
  .eq('user_id', userId)
  .ilike('ocr_text', '%cholesterol%');
```

**References:**
- `user_id` → `auth.users(id)`

**Text Extraction Sources:**
| File Type | Extraction Method | Library |
|-----------|-------------------|---------|
| PDF | Text layer extraction | pdfjs-dist |
| Images (jpg, png, etc.) | OCR | Tesseract.js |
| Text files (.txt, .csv) | Direct read | Native |
| Markdown (.md) | Direct read | Native |
| Word/Excel | Not extracted | N/A |

---

### `medical_medications` table

```sql
CREATE TABLE medical_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,                  -- ✅ Uses 'user_id'
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    prescribing_doctor TEXT,
    pharmacy TEXT,
    refill_date DATE,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('medical_medications')
  .select('*')
  .eq('user_id', userId)
  .eq('active', true);
```

**References:**
- `user_id` → `auth.users(id)`

---

### `medical_emergency_info` table

```sql
CREATE TABLE medical_emergency_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,           -- ✅ One per user
    blood_type TEXT,
    allergies TEXT[],
    medical_conditions TEXT[],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    primary_physician TEXT,
    primary_physician_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern:**
```typescript
// ✅ CORRECT
const { data } = await supabase
  .from('medical_emergency_info')
  .select('*')
  .eq('user_id', userId)
  .single();
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
| `medical_records` | `user_id` | ✅ Has `ocr_text` for AI search |
| `medical_medications` | `user_id` | ✅ |
| `medical_emergency_info` | `user_id` | ✅ One per user (UNIQUE) |
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
