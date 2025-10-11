# Calendar Events Migration - Apply Instructions

## Status
- ✅ Calendar tool successfully registered in PAM (pam.py)
- ✅ Claude successfully calls the tool
- ✅ Migration file created and committed
- ⏳ Migration needs to be applied to database

## Problem
The `calendar_events` table is missing columns that the tool expects:
- `all_day` (BOOLEAN) - Whether event is all-day
- `reminder_minutes` (INTEGER) - Minutes before event to remind
- `color` (TEXT) - Color for calendar display

## Migration File
Location: `supabase/migrations/20251011000001_add_calendar_events_columns.sql`

## SQL to Run
```sql
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

CREATE INDEX IF NOT EXISTS idx_calendar_events_all_day ON public.calendar_events(all_day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, date);
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Paste the SQL above
5. Click "Run"

### Option 2: Supabase CLI
```bash
supabase db push
```
(Requires database password)

### Option 3: Direct Database Connection
```bash
# Get connection string from Supabase dashboard
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Then run the SQL
```

## Verification
After running migration, test with PAM:
```
User: "can you add a dinner appointment for the 13th at 12pm"
```

Expected: Event should be created successfully without database errors.

## Current Error (Before Migration)
```
Error creating calendar event: {
  'message': "Could not find the 'all_day' column of 'calendar_events' in the schema cache",
  'code': 'PGRST204'
}
```

## Commits
- Tool registration: `187e9032`
- Migration creation: `07790abf`
