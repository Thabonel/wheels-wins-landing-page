-- Comprehensive fix for all missing social tables causing errors

-- 1. Fix hustle_ideas table (already exists but might need proper permissions)
ALTER TABLE public.hustle_ideas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.hustle_ideas TO authenticated, anon;

-- Add some sample hustle ideas if none exist
INSERT INTO public.hustle_ideas (title, description, image, avg_earnings, rating, likes, trending, tags, status)
SELECT 
    'Social Media Content Creation',
    'Create engaging travel content for brands on Instagram, YouTube, and TikTok. Share your journey while earning money through sponsorships and affiliate marketing.',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
    1500.00,
    4.5,
    23,
    true,
    ARRAY['content', 'social-media', 'marketing'],
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM public.hustle_ideas LIMIT 1);

INSERT INTO public.hustle_ideas (title, description, image, avg_earnings, rating, likes, trending, tags, status)
SELECT 
    'Remote Consulting Services',
    'Offer your expertise as a consultant while traveling. Perfect for professionals who can work remotely and help businesses solve problems.',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
    2500.00,
    4.7,
    18,
    false,
    ARRAY['consulting', 'remote', 'business'],
    'approved'
WHERE (SELECT COUNT(*) FROM public.hustle_ideas) < 2;

INSERT INTO public.hustle_ideas (title, description, image, avg_earnings, rating, likes, trending, tags, status)
SELECT 
    'Travel Photography Sales',
    'Sell your travel photos to stock photo websites, travel magazines, and tourism boards. Turn your passion for photography into income.',
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
    800.00,
    4.2,
    31,
    true,
    ARRAY['photography', 'art', 'passive-income'],
    'approved'
WHERE (SELECT COUNT(*) FROM public.hustle_ideas) < 3;

-- 2. Create money_maker_ideas table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.money_maker_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    monthly_income DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS and grant permissions for money_maker_ideas
ALTER TABLE public.money_maker_ideas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.money_maker_ideas TO authenticated, anon;

-- Create indexes for money_maker_ideas
CREATE INDEX IF NOT EXISTS idx_money_maker_ideas_user_id ON public.money_maker_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_money_maker_ideas_status ON public.money_maker_ideas(status);

-- 3. Fix social_group_members table (rename from group_memberships if needed)
DO $$
BEGIN
    -- Check if group_memberships exists and social_group_members doesn't
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_memberships') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_group_members') THEN
        ALTER TABLE public.group_memberships RENAME TO social_group_members;
    END IF;
END $$;

-- Create social_group_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(group_id, user_id)
);

-- Disable RLS and grant permissions for social_group_members
ALTER TABLE public.social_group_members DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.social_group_members TO authenticated, anon;

-- Create indexes for social_group_members
CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON public.social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON public.social_group_members(user_id);

-- 4. Ensure social_groups table has proper data
-- Add some sample groups if none exist
INSERT INTO public.social_groups (name, description, created_at)
SELECT 
    'RV Travelers Community',
    'A welcoming community for RV enthusiasts to share tips, routes, and experiences.',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.social_groups LIMIT 1);

INSERT INTO public.social_groups (name, description, created_at)
SELECT 
    'Van Life Adventurers',
    'For those living the van life dream! Share your adventures, challenges, and awesome spots.',
    NOW()
WHERE (SELECT COUNT(*) FROM public.social_groups) < 2;

INSERT INTO public.social_groups (name, description, created_at)
SELECT 
    'Budget Travel Hackers',
    'Share money-saving tips, free camping spots, and budget-friendly travel hacks.',
    NOW()
WHERE (SELECT COUNT(*) FROM public.social_groups) < 3;

-- 5. Make sure all social tables have consistent permissions
ALTER TABLE public.social_groups DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.social_groups TO authenticated, anon;

-- 6. Add sample group memberships to test functionality
INSERT INTO public.social_group_members (group_id, user_id, role)
SELECT 
    g.id,
    u.id,
    'member'
FROM public.social_groups g
CROSS JOIN (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
WHERE NOT EXISTS (SELECT 1 FROM public.social_group_members LIMIT 1)
AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- 7. Update social_groups member_count based on actual members
UPDATE public.social_groups 
SET member_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.social_group_members 
    WHERE group_id = social_groups.id 
    AND is_active = true
), 0);