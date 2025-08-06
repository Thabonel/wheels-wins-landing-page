# Setting Up Staging Supabase

## 1. Create Staging Project
- Go to https://app.supabase.com/projects
- Create new project (name it like "wheels-wins-staging")
- Wait for it to be ready

## 2. Get Production Schema
Run this in your PRODUCTION Supabase SQL Editor:
```sql
-- This will show you all your tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

## 3. Export Schema (Production SQL Editor)
```sql
-- You can use Supabase's built-in schema viewer
-- Go to Database → Schema Visualizer
-- Or Database → Migrations to see all migrations
```

## 4. Key Tables to Replicate
Based on your project, you'll need:
- auth.users (handled by Supabase)
- public.profiles
- public.trips
- public.expenses
- public.pam_conversations
- Any other custom tables

## 5. Update Netlify Staging
Once your staging Supabase is ready:
1. Go to staging project Settings → API
2. Copy the URL and anon key
3. Update in Netlify staging site:
   - VITE_SUPABASE_URL = [staging URL]
   - VITE_SUPABASE_ANON_KEY = [staging anon key]

## 6. Test Connection
```javascript
// Test in browser console after deploy
console.log('Staging Supabase:', import.meta.env.VITE_SUPABASE_URL);
```

## Alternative: Keep Using Production
If you want to keep using the production Supabase:
1. The issue might be that the anon key was rotated
2. Or there's a typo in the Netlify environment variable
3. Double-check by copying the key again from production Supabase
4. Make sure no extra spaces or quotes when pasting in Netlify