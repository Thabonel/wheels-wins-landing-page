-- ============================================================================
-- Income Stream Builder System
-- Part of Life Transition Navigator - Stage 2
-- ============================================================================

-- Table for tracking income streams during transition
CREATE TABLE IF NOT EXISTS income_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES transition_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Income stream details
  stream_name TEXT NOT NULL,
  income_type TEXT NOT NULL
    CHECK (income_type IN ('remote_work', 'freelance', 'passive', 'seasonal')),

  -- Financial projections
  monthly_estimate DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_monthly DECIMAL(10,2) DEFAULT 0,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'setting_up', 'active', 'paused', 'discontinued')),

  -- Setup progress
  setup_checklist JSONB DEFAULT '[]'::jsonb,
  setup_completed BOOLEAN DEFAULT FALSE,
  setup_completed_date DATE,

  -- Resources and notes
  resources JSONB DEFAULT '[]'::jsonb,  -- Array of {title, url}
  notes TEXT,

  -- Priority for setup
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  discontinued_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_income_streams_profile ON income_streams(profile_id);
CREATE INDEX IF NOT EXISTS idx_income_streams_user ON income_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_income_streams_type ON income_streams(income_type);
CREATE INDEX IF NOT EXISTS idx_income_streams_status ON income_streams(status);

-- Enable RLS
ALTER TABLE income_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY income_streams_user_isolation ON income_streams
  FOR ALL USING (auth.uid() = user_id);

-- Function to create default income stream templates
CREATE OR REPLACE FUNCTION create_default_income_streams(
  p_profile_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Remote work templates
  INSERT INTO income_streams (profile_id, user_id, stream_name, income_type, status, setup_checklist, resources, priority)
  VALUES
    (
      p_profile_id,
      p_user_id,
      'Remote Employment',
      'remote_work',
      'planning',
      '[
        {"task": "Update resume with remote experience", "completed": false},
        {"task": "Set up home office workspace", "completed": false},
        {"task": "Research companies hiring remote", "completed": false},
        {"task": "Join remote job boards", "completed": false},
        {"task": "Prepare for remote interviews", "completed": false}
      ]'::jsonb,
      '[
        {"title": "We Work Remotely", "url": "https://weworkremotely.com"},
        {"title": "Remote.co", "url": "https://remote.co"},
        {"title": "FlexJobs", "url": "https://www.flexjobs.com"}
      ]'::jsonb,
      'high'
    );

  -- Freelance templates
  INSERT INTO income_streams (profile_id, user_id, stream_name, income_type, status, setup_checklist, resources, priority)
  VALUES
    (
      p_profile_id,
      p_user_id,
      'Freelance Consulting',
      'freelance',
      'planning',
      '[
        {"task": "Create portfolio website", "completed": false},
        {"task": "Set up payment processing (PayPal/Stripe)", "completed": false},
        {"task": "Register freelance profile on platforms", "completed": false},
        {"task": "Define service packages and pricing", "completed": false},
        {"task": "Create client contracts template", "completed": false}
      ]'::jsonb,
      '[
        {"title": "Upwork", "url": "https://www.upwork.com"},
        {"title": "Fiverr", "url": "https://www.fiverr.com"},
        {"title": "Toptal", "url": "https://www.toptal.com"}
      ]'::jsonb,
      'high'
    ),
    (
      p_profile_id,
      p_user_id,
      'Content Creation',
      'freelance',
      'planning',
      '[
        {"task": "Choose content niche", "completed": false},
        {"task": "Set up YouTube/blog/podcast", "completed": false},
        {"task": "Create content calendar", "completed": false},
        {"task": "Research monetization options", "completed": false},
        {"task": "Join creator communities", "completed": false}
      ]'::jsonb,
      '[
        {"title": "YouTube Partner Program", "url": "https://www.youtube.com/creators"},
        {"title": "Patreon", "url": "https://www.patreon.com"},
        {"title": "Medium Partner Program", "url": "https://medium.com/creators"}
      ]'::jsonb,
      'medium'
    );

  -- Passive income templates
  INSERT INTO income_streams (profile_id, user_id, stream_name, income_type, status, setup_checklist, resources, priority)
  VALUES
    (
      p_profile_id,
      p_user_id,
      'Digital Products',
      'passive',
      'planning',
      '[
        {"task": "Identify product idea", "completed": false},
        {"task": "Create or source product", "completed": false},
        {"task": "Set up online store", "completed": false},
        {"task": "Create marketing materials", "completed": false},
        {"task": "Launch and automate", "completed": false}
      ]'::jsonb,
      '[
        {"title": "Gumroad", "url": "https://gumroad.com"},
        {"title": "Etsy", "url": "https://www.etsy.com"},
        {"title": "Shopify", "url": "https://www.shopify.com"}
      ]'::jsonb,
      'medium'
    ),
    (
      p_profile_id,
      p_user_id,
      'Investment Income',
      'passive',
      'planning',
      '[
        {"task": "Review current investment portfolio", "completed": false},
        {"task": "Consider dividend stocks or REITs", "completed": false},
        {"task": "Set up automatic reinvestment", "completed": false},
        {"task": "Ensure mobile access to accounts", "completed": false},
        {"task": "Plan for tax implications while traveling", "completed": false}
      ]'::jsonb,
      '[
        {"title": "Vanguard", "url": "https://investor.vanguard.com"},
        {"title": "M1 Finance", "url": "https://www.m1finance.com"},
        {"title": "Fundrise", "url": "https://fundrise.com"}
      ]'::jsonb,
      'low'
    );

  -- Seasonal templates
  INSERT INTO income_streams (profile_id, user_id, stream_name, income_type, status, setup_checklist, resources, priority)
  VALUES
    (
      p_profile_id,
      p_user_id,
      'Seasonal Work (Summer)',
      'seasonal',
      'planning',
      '[
        {"task": "Research seasonal job opportunities", "completed": false},
        {"task": "Create list of preferred locations", "completed": false},
        {"task": "Apply 3-6 months in advance", "completed": false},
        {"task": "Arrange RV parking with employer", "completed": false},
        {"task": "Plan budget for off-season", "completed": false}
      ]'::jsonb,
      '[
        {"title": "Coolworks", "url": "https://www.coolworks.com"},
        {"title": "Workamper News", "url": "https://www.workamper.com"},
        {"title": "USAJOBS (Park Rangers)", "url": "https://www.usajobs.gov"}
      ]'::jsonb,
      'medium'
    ),
    (
      p_profile_id,
      p_user_id,
      'Holiday Retail',
      'seasonal',
      'planning',
      '[
        {"task": "Identify retail opportunities (Nov-Dec)", "completed": false},
        {"task": "Apply to Amazon CamperForce", "completed": false},
        {"task": "Research other seasonal programs", "completed": false},
        {"task": "Plan parking near work location", "completed": false},
        {"task": "Budget for peak earning months", "completed": false}
      ]'::jsonb,
      '[
        {"title": "Amazon CamperForce", "url": "https://www.amazon.jobs/camperforce"},
        {"title": "Seasonal Mall Jobs", "url": "https://www.indeed.com"}
      ]'::jsonb,
      'low'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get income stream summary statistics
CREATE OR REPLACE FUNCTION get_income_stats(p_profile_id UUID)
RETURNS TABLE(
  total_streams INTEGER,
  active_streams INTEGER,
  total_monthly_estimate DECIMAL(10,2),
  total_actual_monthly DECIMAL(10,2),
  remote_work_count INTEGER,
  freelance_count INTEGER,
  passive_count INTEGER,
  seasonal_count INTEGER,
  setup_completion_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id),
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id AND status = 'active'),
    (SELECT COALESCE(SUM(monthly_estimate), 0) FROM income_streams WHERE profile_id = p_profile_id),
    (SELECT COALESCE(SUM(actual_monthly), 0) FROM income_streams WHERE profile_id = p_profile_id AND status = 'active'),
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id AND income_type = 'remote_work'),
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id AND income_type = 'freelance'),
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id AND income_type = 'passive'),
    (SELECT COUNT(*)::INTEGER FROM income_streams WHERE profile_id = p_profile_id AND income_type = 'seasonal'),
    (SELECT
      CASE WHEN COUNT(*) > 0
      THEN FLOOR((COUNT(CASE WHEN setup_completed = TRUE THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100)::INTEGER
      ELSE 0 END
     FROM income_streams WHERE profile_id = p_profile_id);
END;
$$ LANGUAGE plpgsql;
