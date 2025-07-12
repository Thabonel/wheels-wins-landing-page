-- Fix social_group_members table columns and structure

-- First, let's check what we're working with and fix the table structure
DO $$
BEGIN
    -- If group_memberships exists, make sure it has all the right columns before renaming
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_memberships') THEN
        -- Add missing columns to group_memberships if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='group_memberships' AND column_name='role') THEN
            ALTER TABLE public.group_memberships 
            ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='group_memberships' AND column_name='is_active') THEN
            ALTER TABLE public.group_memberships 
            ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        
        -- Now rename to social_group_members if social_group_members doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_group_members') THEN
            ALTER TABLE public.group_memberships RENAME TO social_group_members;
        END IF;
    END IF;
    
    -- If social_group_members exists but is missing columns, add them
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_group_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='social_group_members' AND column_name='role') THEN
            ALTER TABLE public.social_group_members 
            ADD COLUMN role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='social_group_members' AND column_name='is_active') THEN
            ALTER TABLE public.social_group_members 
            ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
    END IF;
END $$;

-- Create the table from scratch if neither exists
CREATE TABLE IF NOT EXISTS public.social_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.social_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(group_id, user_id)
);

-- Make sure permissions are set
ALTER TABLE public.social_group_members DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.social_group_members TO authenticated, anon;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON public.social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON public.social_group_members(user_id);

-- Now safely insert sample data using only columns that definitely exist
INSERT INTO public.social_group_members (group_id, user_id)
SELECT 
    g.id,
    u.id
FROM public.social_groups g
CROSS JOIN (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) u
WHERE NOT EXISTS (SELECT 1 FROM public.social_group_members LIMIT 1)
AND EXISTS (SELECT 1 FROM auth.users LIMIT 1)
LIMIT 3; -- Only add memberships to first 3 groups

-- Update the role column if it exists
UPDATE public.social_group_members 
SET role = 'member' 
WHERE role IS NULL 
AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='social_group_members' AND column_name='role'
);

-- Update social_groups member_count based on actual members
UPDATE public.social_groups 
SET member_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.social_group_members 
    WHERE group_id = social_groups.id 
    AND (is_active = true OR is_active IS NULL)
), 0)
WHERE EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name='social_groups' AND column_name='member_count');