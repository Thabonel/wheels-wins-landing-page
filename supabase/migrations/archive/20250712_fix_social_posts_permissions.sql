-- Fix social_posts RLS policies to allow proper viewing
-- The issue is that the current policy doesn't allow unauthenticated users to view posts

-- Drop and recreate the view policy to allow public viewing of approved posts
DROP POLICY IF EXISTS "Anyone can view approved posts" ON public.social_posts;

-- Create a policy that truly allows anyone to view approved posts
CREATE POLICY "Anyone can view approved posts" ON public.social_posts
    FOR SELECT
    USING (
        status = 'approved' 
        OR (auth.uid() IS NOT NULL AND auth.uid()::uuid = user_id)
    );

-- Also ensure that authenticated users can see their own posts regardless of status
CREATE POLICY "Users can view their own posts" ON public.social_posts
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND auth.uid()::uuid = user_id);

-- Grant necessary permissions to authenticated and anonymous users
GRANT SELECT ON public.social_posts TO authenticated;
GRANT SELECT ON public.social_posts TO anon;

-- Also ensure post_votes table has proper permissions
GRANT SELECT ON public.post_votes TO authenticated;
GRANT SELECT ON public.post_votes TO anon;

-- Add a simple approved post if none exist to test the functionality
INSERT INTO public.social_posts (user_id, content, status, location, created_at)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'thabonel0@gmail.com' LIMIT 1),
    'Welcome to the Wheels and Wins social feed! Share your travel adventures, tips, and connect with fellow travelers. This community is here to help you make the most of your journey! 🚐✨',
    'approved',
    'feed',
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.social_posts WHERE status = 'approved' LIMIT 1);