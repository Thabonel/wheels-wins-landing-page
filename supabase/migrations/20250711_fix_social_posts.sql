-- Ensure social_posts table exists with correct structure
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  location TEXT DEFAULT 'feed' CHECK (location IN ('feed', 'group', 'profile')),
  group_id UUID REFERENCES public.social_groups(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON public.social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_location ON public.social_posts(location);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_group_id ON public.social_posts(group_id);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.social_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.social_posts;

-- Create RLS policies
CREATE POLICY "Anyone can view approved posts" ON public.social_posts
    FOR SELECT
    USING (
        status = 'approved' 
        OR (status = 'pending' AND auth.uid() = user_id)
        OR (status = 'hidden' AND auth.uid() = user_id)
    );

CREATE POLICY "Users can create posts" ON public.social_posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.social_posts
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.social_posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create post_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type BOOLEAN NOT NULL, -- true for upvote, false for downvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create indexes for post_votes
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON public.post_votes(user_id);

-- Enable RLS on post_votes
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can create their own votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.post_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.post_votes;

-- Create RLS policies for post_votes
CREATE POLICY "Users can view all votes" ON public.post_votes
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own votes" ON public.post_votes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.post_votes
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON public.post_votes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update vote counts
CREATE OR REPLACE FUNCTION public.update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = true THEN
      UPDATE public.social_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE public.social_posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = true THEN
      UPDATE public.social_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
    ELSE
      UPDATE public.social_posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change
    IF OLD.vote_type = true AND NEW.vote_type = false THEN
      UPDATE public.social_posts 
      SET upvotes = GREATEST(0, upvotes - 1), downvotes = downvotes + 1 
      WHERE id = NEW.post_id;
    ELSIF OLD.vote_type = false AND NEW.vote_type = true THEN
      UPDATE public.social_posts 
      SET downvotes = GREATEST(0, downvotes - 1), upvotes = upvotes + 1 
      WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote counts
DROP TRIGGER IF EXISTS update_post_vote_counts_trigger ON public.post_votes;
CREATE TRIGGER update_post_vote_counts_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.post_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_vote_counts();

-- Add some sample data for testing (only if table is empty)
INSERT INTO public.social_posts (user_id, content, status, location)
SELECT 
    auth.uid(), 
    'Welcome to Wheels and Wins! This is the first post on our social platform. Share your travel experiences, tips, and connect with fellow travelers!',
    'approved',
    'feed'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.social_posts LIMIT 1);