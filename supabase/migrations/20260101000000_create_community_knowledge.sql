-- Community Knowledge Center
-- Allows users to submit guides/articles for admin approval
-- Public browsing, PAM integration, print/PDF export

-- Main knowledge table
CREATE TABLE IF NOT EXISTS public.community_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown format
  excerpt TEXT, -- Short summary for listing pages
  category TEXT NOT NULL, -- 'shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general'

  -- Author & Approval
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  estimated_read_time INTEGER, -- minutes

  -- Engagement
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feedback on articles
CREATE TABLE IF NOT EXISTS public.community_knowledge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES community_knowledge(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One feedback per user per article
  UNIQUE(article_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_knowledge_status ON community_knowledge(status);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_category ON community_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_author ON community_knowledge(author_id);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_created ON community_knowledge(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_tags ON community_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_knowledge_feedback_article ON community_knowledge_feedback(article_id);

-- RLS Policies
ALTER TABLE public.community_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_knowledge_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved articles
CREATE POLICY "public_read_approved_articles"
  ON community_knowledge
  FOR SELECT
  USING (status = 'approved');

-- Authenticated users can submit articles
CREATE POLICY "authenticated_create_articles"
  ON community_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can view their own pending/rejected articles
CREATE POLICY "authors_read_own_articles"
  ON community_knowledge
  FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- Authors can update their own pending articles
CREATE POLICY "authors_update_pending_articles"
  ON community_knowledge
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending')
  WITH CHECK (auth.uid() = author_id AND status = 'pending');

-- Authors can delete their own pending articles
CREATE POLICY "authors_delete_pending_articles"
  ON community_knowledge
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id AND status = 'pending');

-- Admins can do everything
CREATE POLICY "admins_all_access_knowledge"
  ON community_knowledge
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Feedback policies
CREATE POLICY "authenticated_create_feedback"
  ON community_knowledge_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_feedback"
  ON community_knowledge_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_feedback"
  ON community_knowledge_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_all_access_feedback"
  ON community_knowledge_feedback
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Function to update helpful_count when feedback changes
CREATE OR REPLACE FUNCTION update_article_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count + (CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END)
    WHERE id = NEW.article_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count + (CASE WHEN NEW.is_helpful THEN 1 ELSE -1 END) - (CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END)
    WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_knowledge
    SET helpful_count = helpful_count - (CASE WHEN OLD.is_helpful THEN 1 ELSE -1 END)
    WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_helpful_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON community_knowledge_feedback
FOR EACH ROW EXECUTE FUNCTION update_article_helpful_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_community_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON community_knowledge
FOR EACH ROW EXECUTE FUNCTION update_community_knowledge_updated_at();
