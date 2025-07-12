-- Fix social_posts table constraints and add missing foreign key
-- This should resolve post creation failures

-- First, ensure the social_groups table exists for the foreign key
CREATE TABLE IF NOT EXISTS public.social_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Now fix the social_posts table to add proper foreign key constraint for group_id
ALTER TABLE public.social_posts 
DROP CONSTRAINT IF EXISTS social_posts_group_id_fkey;

ALTER TABLE public.social_posts 
ADD CONSTRAINT social_posts_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES public.social_groups(id) ON DELETE SET NULL;

-- Make sure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_location ON public.social_posts(location);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_group_id ON public.social_posts(group_id);

-- Ensure all permissions are still granted
GRANT ALL ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO anon;
GRANT ALL ON public.social_groups TO authenticated;
GRANT ALL ON public.social_groups TO anon;

-- Disable RLS on groups table too for now
ALTER TABLE public.social_groups DISABLE ROW LEVEL SECURITY;

-- Add a default test group if none exist
INSERT INTO public.social_groups (name, description, owner_id, privacy)
SELECT 
    'Travelers Community',
    'A general community for all travelers to share experiences and tips',
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    'public'
WHERE NOT EXISTS (SELECT 1 FROM public.social_groups LIMIT 1);