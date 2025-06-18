
-- Create hustle_ideas table (this is missing)
CREATE TABLE IF NOT EXISTS public.hustle_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    avg_earnings NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    likes INTEGER DEFAULT 0,
    trending BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table (this is missing)
CREATE TABLE IF NOT EXISTS public.group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.social_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(group_id, user_id)
);

-- Update existing social_groups table to add missing columns
ALTER TABLE public.social_groups 
ADD COLUMN IF NOT EXISTS cover TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraint for activity_level if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'social_groups_activity_level_check'
    ) THEN
        ALTER TABLE public.social_groups 
        ADD CONSTRAINT social_groups_activity_level_check 
        CHECK (activity_level IN ('active', 'new', 'quiet'));
    END IF;
END $$;

-- Update existing social_posts table to add missing columns
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Update marketplace_listings table to ensure it has all needed columns
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS seller TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good',
ADD COLUMN IF NOT EXISTS posted TEXT DEFAULT 'today',
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image TEXT;

-- Enable Row Level Security on new tables
ALTER TABLE public.hustle_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hustle_ideas
DROP POLICY IF EXISTS "Anyone can view approved hustle ideas" ON public.hustle_ideas;
CREATE POLICY "Anyone can view approved hustle ideas" ON public.hustle_ideas
    FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can create hustle ideas" ON public.hustle_ideas;
CREATE POLICY "Users can create hustle ideas" ON public.hustle_ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own hustle ideas" ON public.hustle_ideas;
CREATE POLICY "Users can update own hustle ideas" ON public.hustle_ideas
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for group_memberships
DROP POLICY IF EXISTS "Users can view group memberships" ON public.group_memberships;
CREATE POLICY "Users can view group memberships" ON public.group_memberships
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.social_groups 
            WHERE id = group_id AND (owner_id = auth.uid() OR admin_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can join groups" ON public.group_memberships;
CREATE POLICY "Users can join groups" ON public.group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave groups or admins can manage" ON public.group_memberships;
CREATE POLICY "Users can leave groups or admins can manage" ON public.group_memberships
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.social_groups 
            WHERE id = group_id AND (owner_id = auth.uid() OR admin_id = auth.uid())
        )
    );

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_hustle_ideas_updated_at ON public.hustle_ideas;
CREATE TRIGGER update_hustle_ideas_updated_at 
    BEFORE UPDATE ON public.hustle_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_groups_updated_at ON public.social_groups;
CREATE TRIGGER update_social_groups_updated_at 
    BEFORE UPDATE ON public.social_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.social_groups 
        SET member_count = member_count + 1 
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.social_groups 
        SET member_count = member_count - 1 
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_member_count_trigger ON public.group_memberships;
CREATE TRIGGER update_member_count_trigger
    AFTER INSERT OR DELETE ON public.group_memberships
    FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Insert sample data for testing (only if tables are empty)
INSERT INTO public.hustle_ideas (title, description, avg_earnings, rating, likes, trending, tags, status) 
SELECT * FROM (VALUES
    ('Freelance Writing', 'Write articles and blog posts for businesses while traveling', 2500, 4.5, 125, true, ARRAY['writing', 'remote', 'flexible'], 'approved'),
    ('Photography Services', 'Offer travel and event photography services in different locations', 1800, 4.2, 89, false, ARRAY['photography', 'creative', 'travel'], 'approved'),
    ('Online Tutoring', 'Teach languages or skills online from anywhere with good internet', 2200, 4.7, 156, true, ARRAY['education', 'remote', 'languages'], 'approved'),
    ('Handmade Crafts', 'Create and sell handmade items at local markets and online', 800, 4.0, 67, false, ARRAY['crafts', 'creative', 'markets'], 'approved')
) AS t(title, description, avg_earnings, rating, likes, trending, tags, status)
WHERE NOT EXISTS (SELECT 1 FROM public.hustle_ideas LIMIT 1);

-- Update social_groups with sample data if empty
UPDATE public.social_groups SET 
    member_count = CASE name
        WHEN 'RV Life Beginners' THEN 1247
        WHEN 'Digital Nomads on Wheels' THEN 892
        WHEN 'Caravan Maintenance Tips' THEN 634
        WHEN 'Budget Travel Australia' THEN 1523
        ELSE member_count
    END,
    location = COALESCE(location, 'Australia-wide'),
    activity_level = COALESCE(activity_level, 'active'),
    is_active = COALESCE(is_active, true)
WHERE EXISTS (SELECT 1 FROM public.social_groups);

-- Insert marketplace sample data if table is mostly empty
INSERT INTO public.marketplace_listings (title, price, description, category, location, seller, condition, posted, status, image) 
SELECT * FROM (VALUES
    ('Solar Panel Kit 200W', 450.00, 'Complete solar setup perfect for RVs. Barely used, excellent condition.', 'Electronics', 'Brisbane, QLD', 'Mike_RV', 'excellent', '2 days ago', 'approved', 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=400'),
    ('Camping Chairs Set of 4', 120.00, 'Lightweight folding chairs, perfect for outdoor adventures.', 'Furniture', 'Sydney, NSW', 'Sarah_Travels', 'good', '1 week ago', 'approved', 'https://images.unsplash.com/photo-1441794016917-7b6933969960?w=400'),
    ('Diesel Generator 3000W', 800.00, 'Reliable backup power for extended off-grid stays.', 'Electronics', 'Melbourne, VIC', 'Dave_Nomad', 'good', '3 days ago', 'approved', 'https://images.unsplash.com/photo-1621905251189-69bdcf6066b5?w=400'),
    ('RV Awning 18ft', 650.00, 'Retractable awning in great condition. Easy to install.', 'Parts', 'Perth, WA', 'Lisa_Adventure', 'excellent', '5 days ago', 'approved', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400')
) AS t(title, price, description, category, location, seller, condition, posted, status, image)
WHERE (SELECT COUNT(*) FROM public.marketplace_listings WHERE status = 'approved') < 4;
