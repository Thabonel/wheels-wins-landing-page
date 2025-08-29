# Fix Trip Templates in Supabase Dashboard

## The Problem
Only 2 trip templates are showing because:
1. The RLS (Row Level Security) policies only allow authenticated users to view public templates
2. Anonymous users can't see any templates, causing the query to fail
3. The app falls back to showing only 2 hardcoded templates

## Quick Fix via Supabase Dashboard

### Step 1: Fix RLS Policies
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Run this SQL to fix the policies:

```sql
-- Fix RLS policies to allow everyone to view public templates
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "authenticated_users_view_public_templates" ON public.trip_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.trip_templates;

-- Create new policy allowing EVERYONE (including anonymous) to view public templates
CREATE POLICY "anyone_can_view_public_templates" 
ON public.trip_templates
FOR SELECT
TO public  -- This is the key: allows both authenticated and anonymous
USING (is_public = true);

-- Keep other policies for authenticated users
CREATE POLICY IF NOT EXISTS "users_view_own_templates" 
ON public.trip_templates
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY IF NOT EXISTS "users_manage_own_templates" 
ON public.trip_templates
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON public.trip_templates TO anon, authenticated;
```

### Step 2: Insert Australian Trip Templates
Run this SQL to add the missing templates:

```sql
-- Insert Australian trip templates
INSERT INTO trip_templates (
    user_id,
    name,
    description,
    category,
    is_public,
    tags,
    usage_count,
    template_data
) VALUES 
(
    NULL,
    'Great Ocean Road Classic',
    'Melbourne to Adelaide coastal adventure featuring the iconic Twelve Apostles and charming seaside towns.',
    'coastal',
    true,
    ARRAY['australia', 'coastal', 'scenic', 'victoria'],
    0,
    '{"difficulty": "beginner", "duration_days": 7, "distance_miles": 400, "estimated_budget": 1200, "highlights": ["Twelve Apostles", "Port Campbell", "Lorne Beach", "Apollo Bay"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'The Big Lap - Around Australia',
    'Complete circumnavigation of Australia covering all states and territories. The ultimate Australian RV adventure.',
    'epic_journeys',
    true,
    ARRAY['australia', 'epic', 'long-term'],
    0,
    '{"difficulty": "advanced", "duration_days": 90, "distance_miles": 9300, "estimated_budget": 12000, "highlights": ["All capital cities", "Uluru", "Great Barrier Reef", "Nullarbor Plain"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'East Coast Discovery',
    'Sydney to Cairns coastal adventure with stunning beaches, rainforest, and the Great Barrier Reef.',
    'coastal',
    true,
    ARRAY['australia', 'beaches', 'reef', 'queensland'],
    0,
    '{"difficulty": "intermediate", "duration_days": 21, "distance_miles": 1700, "estimated_budget": 3500, "highlights": ["Great Barrier Reef", "Byron Bay", "Gold Coast", "Whitsundays"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Red Centre Explorer',
    'Uluru, Kings Canyon and MacDonnell Ranges outback adventure through the heart of Australia.',
    'outback',
    true,
    ARRAY['australia', 'outback', 'desert', 'cultural'],
    0,
    '{"difficulty": "advanced", "duration_days": 14, "distance_miles": 1200, "estimated_budget": 2800, "highlights": ["Uluru", "Kings Canyon", "Alice Springs", "MacDonnell Ranges"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Savannah Way Adventure',
    'Cairns to Broome tropical crossing through Queensland, Northern Territory and Western Australia.',
    'adventure',
    true,
    ARRAY['australia', 'tropical', 'adventure', 'remote'],
    0,
    '{"difficulty": "advanced", "duration_days": 18, "distance_miles": 2300, "estimated_budget": 3200, "highlights": ["Kakadu", "Katherine Gorge", "Kimberleys", "Bungle Bungles"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Tasmania Circuit',
    'Complete loop of Tasmania featuring pristine wilderness, historic sites and gourmet experiences.',
    'island',
    true,
    ARRAY['australia', 'tasmania', 'wilderness', 'gourmet'],
    0,
    '{"difficulty": "beginner", "duration_days": 10, "distance_miles": 800, "estimated_budget": 1800, "highlights": ["Cradle Mountain", "Wineglass Bay", "Port Arthur", "MONA"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Southwest WA Wine & Surf',
    'Perth to Esperance via Margaret River wine region, tall forests and pristine beaches.',
    'wine_culinary',
    true,
    ARRAY['australia', 'wine', 'beaches', 'western-australia'],
    0,
    '{"difficulty": "beginner", "duration_days": 12, "distance_miles": 900, "estimated_budget": 2200, "highlights": ["Margaret River", "Karri Forests", "Lucky Bay", "Wave Rock"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Queensland Outback Trail',
    'Brisbane to Mount Isa via historic mining towns and dinosaur country.',
    'historical',
    true,
    ARRAY['australia', 'outback', 'history', 'queensland'],
    0,
    '{"difficulty": "intermediate", "duration_days": 14, "distance_miles": 1100, "estimated_budget": 2400, "highlights": ["Carnarvon Gorge", "Winton Dinosaurs", "Longreach", "Mount Isa"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Murray River Journey',
    'Follow Australia''s mightiest river from the mountains to the sea through historic river towns.',
    'river_lakes',
    true,
    ARRAY['australia', 'river', 'historic', 'family-friendly'],
    0,
    '{"difficulty": "beginner", "duration_days": 10, "distance_miles": 750, "estimated_budget": 1600, "highlights": ["Echuca", "Swan Hill", "Mildura", "Murray Mouth"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Gibb River Road Expedition',
    'Epic 4WD adventure through the Kimberley wilderness with gorges, waterfalls and ancient rock art.',
    'adventure',
    true,
    ARRAY['australia', '4wd', 'kimberley', 'remote'],
    0,
    '{"difficulty": "advanced", "duration_days": 7, "distance_miles": 400, "estimated_budget": 2500, "highlights": ["Windjana Gorge", "Bell Gorge", "El Questro", "Mitchell Falls"], "region": "Australia"}'::jsonb
),
(
    NULL,
    'Victorian High Country',
    'Alpine adventure through Victoria''s mountain country with historic towns and mountain vistas.',
    'mountain',
    true,
    ARRAY['australia', 'mountains', 'alpine', 'victoria'],
    0,
    '{"difficulty": "intermediate", "duration_days": 7, "distance_miles": 500, "estimated_budget": 1400, "highlights": ["Mount Buffalo", "Bright", "Falls Creek", "Beechworth"], "region": "Australia"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;  -- Skip if template already exists

-- Verify the results
SELECT COUNT(*) as total_australian_templates
FROM trip_templates
WHERE 'australia' = ANY(tags) AND is_public = true;
```

### Step 3: Verify It Worked
After running both SQL scripts:
1. Go to your Wheels & Wins app
2. Navigate to the Wheels page
3. You should now see 11+ Australian trip templates instead of just 2

## Alternative: Browser Console Fix

If you can't access the Supabase dashboard SQL editor, you can run the fix from your browser:

1. Log in to your Wheels & Wins app as an admin user
2. Open browser console (F12)
3. Copy and run the contents of `browser-fix-trip-templates.js`

## Temporary Fix Already Applied

The app now includes 11 hardcoded Australian templates as a fallback, so users will see more options even if the database fix hasn't been applied yet. However, applying the database fix is recommended for:
- Better performance
- Ability to add/edit templates
- Proper usage tracking
- Custom user templates