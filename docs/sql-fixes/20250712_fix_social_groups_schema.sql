-- Fix social_groups table schema and the failed insert
-- The error occurred because we tried to insert into columns that don't exist

-- First, add the missing columns to social_groups table if they don't exist
DO $$
BEGIN
    -- Add owner_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='social_groups' AND column_name='owner_id') THEN
        ALTER TABLE public.social_groups 
        ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add privacy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='social_groups' AND column_name='privacy') THEN
        ALTER TABLE public.social_groups 
        ADD COLUMN privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private'));
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='social_groups' AND column_name='description') THEN
        ALTER TABLE public.social_groups 
        ADD COLUMN description TEXT;
    END IF;
    
    -- Add member_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='social_groups' AND column_name='member_count') THEN
        ALTER TABLE public.social_groups 
        ADD COLUMN member_count INTEGER DEFAULT 1;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='social_groups' AND column_name='updated_at') THEN
        ALTER TABLE public.social_groups 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Now fix the foreign key constraint that might have failed
ALTER TABLE public.social_posts 
DROP CONSTRAINT IF EXISTS social_posts_group_id_fkey;

ALTER TABLE public.social_posts 
ADD CONSTRAINT social_posts_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES public.social_groups(id) ON DELETE SET NULL;

-- Ensure permissions on social_groups
GRANT ALL ON public.social_groups TO authenticated;
GRANT ALL ON public.social_groups TO anon;
ALTER TABLE public.social_groups DISABLE ROW LEVEL SECURITY;

-- Now try the insert again with proper columns
INSERT INTO public.social_groups (name, description, owner_id, privacy)
SELECT 
    'Travelers Community',
    'A general community for all travelers to share experiences and tips',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'public'
WHERE NOT EXISTS (SELECT 1 FROM public.social_groups LIMIT 1)
AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- If no users exist, create a simple group without owner
INSERT INTO public.social_groups (name, description, privacy)
SELECT 
    'Travelers Community',
    'A general community for all travelers to share experiences and tips',
    'public'
WHERE NOT EXISTS (SELECT 1 FROM public.social_groups LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1);