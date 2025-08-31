-- Trip Template Enhancements Migration (Corrected for profiles.role)
-- Adds rating, comments, images, and scraper functionality

-- First check if we need the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add columns to existing trip_templates table
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1);
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE trip_templates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Trip template ratings table
CREATE TABLE IF NOT EXISTS trip_template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES trip_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Trip template comments/reviews table
CREATE TABLE IF NOT EXISTS trip_template_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES trip_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES trip_template_comments(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('review', 'hazard', 'fuel_tip', 'food_tip', 'general_tip')),
  content TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip template images table
CREATE TABLE IF NOT EXISTS trip_template_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES trip_templates(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false,
  source TEXT CHECK (source IN ('scraper', 'upload', 'user')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraper jobs for trip discovery
CREATE TABLE IF NOT EXISTS trip_scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  source_url TEXT,
  region TEXT,
  parameters JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  templates_created INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Comment helpfulness tracking
CREATE TABLE IF NOT EXISTS trip_comment_helpful (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES trip_template_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE trip_template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_template_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_template_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_comment_helpful ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
CREATE POLICY "Users can view all ratings" ON trip_template_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own ratings" ON trip_template_ratings
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Users can view all comments" ON trip_template_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON trip_template_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON trip_template_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON trip_template_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for images (fixed to use role = 'admin')
CREATE POLICY "Anyone can view template images" ON trip_template_images
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage template images" ON trip_template_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for scraper jobs (fixed to use role = 'admin')
CREATE POLICY "Admins can manage scraper jobs" ON trip_scraper_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for comment helpfulness
CREATE POLICY "Users can view helpfulness" ON trip_comment_helpful
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own helpfulness votes" ON trip_comment_helpful
  FOR ALL USING (auth.uid() = user_id);

-- Function to update average rating when a rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_template_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trip_templates
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM trip_template_ratings
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM trip_template_ratings
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rating updates
DROP TRIGGER IF EXISTS update_template_rating_trigger ON trip_template_ratings;
CREATE TRIGGER update_template_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON trip_template_ratings
FOR EACH ROW EXECUTE FUNCTION update_template_average_rating();

-- Function to update comment helpful count
CREATE OR REPLACE FUNCTION update_comment_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trip_template_comments
  SET helpful_count = (
    SELECT COUNT(*)
    FROM trip_comment_helpful
    WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id)
    AND is_helpful = true
  )
  WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for helpful count updates
DROP TRIGGER IF EXISTS update_comment_helpful_trigger ON trip_comment_helpful;
CREATE TRIGGER update_comment_helpful_trigger
AFTER INSERT OR UPDATE OR DELETE ON trip_comment_helpful
FOR EACH ROW EXECUTE FUNCTION update_comment_helpful_count();

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_trip_template_ratings_updated_at ON trip_template_ratings;
CREATE TRIGGER update_trip_template_ratings_updated_at
  BEFORE UPDATE ON trip_template_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_template_comments_updated_at ON trip_template_comments;
CREATE TRIGGER update_trip_template_comments_updated_at
  BEFORE UPDATE ON trip_template_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_template_ratings_template_id ON trip_template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_ratings_user_id ON trip_template_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_comments_template_id ON trip_template_comments(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_comments_type ON trip_template_comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_trip_template_images_template_id ON trip_template_images(template_id);
CREATE INDEX IF NOT EXISTS idx_trip_template_images_primary ON trip_template_images(template_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_trip_scraper_jobs_status ON trip_scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_trip_comment_helpful_comment_id ON trip_comment_helpful(comment_id);