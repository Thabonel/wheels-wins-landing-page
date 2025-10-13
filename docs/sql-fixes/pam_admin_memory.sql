CREATE TABLE IF NOT EXISTS pam_admin_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('location_tip', 'travel_rule', 'seasonal_advice', 'general_knowledge', 'policy', 'warning')),
  category TEXT NOT NULL CHECK (category IN ('travel', 'budget', 'social', 'shop', 'general')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location_context TEXT,
  date_context TEXT,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0
);

CREATE INDEX idx_pam_admin_knowledge_category ON pam_admin_knowledge(category);
CREATE INDEX idx_pam_admin_knowledge_type ON pam_admin_knowledge(knowledge_type);
CREATE INDEX idx_pam_admin_knowledge_priority ON pam_admin_knowledge(priority DESC);
CREATE INDEX idx_pam_admin_knowledge_active ON pam_admin_knowledge(is_active) WHERE is_active = true;
CREATE INDEX idx_pam_admin_knowledge_tags ON pam_admin_knowledge USING GIN(tags);
CREATE INDEX idx_pam_admin_knowledge_location ON pam_admin_knowledge(location_context) WHERE location_context IS NOT NULL;

CREATE TABLE IF NOT EXISTS pam_knowledge_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES pam_admin_knowledge(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_context TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pam_knowledge_usage_knowledge ON pam_knowledge_usage_log(knowledge_id);
CREATE INDEX idx_pam_knowledge_usage_user ON pam_knowledge_usage_log(user_id);
CREATE INDEX idx_pam_knowledge_usage_date ON pam_knowledge_usage_log(used_at DESC);

CREATE OR REPLACE FUNCTION update_knowledge_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pam_admin_knowledge
  SET
    usage_count = usage_count + 1,
    last_used_at = NEW.used_at
  WHERE id = NEW.knowledge_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_usage
AFTER INSERT ON pam_knowledge_usage_log
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_usage();

CREATE OR REPLACE FUNCTION update_admin_knowledge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_knowledge_timestamp
BEFORE UPDATE ON pam_admin_knowledge
FOR EACH ROW
EXECUTE FUNCTION update_admin_knowledge_timestamp();

ALTER TABLE pam_admin_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_knowledge_all ON pam_admin_knowledge
FOR ALL USING (true);

ALTER TABLE pam_knowledge_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_usage_all ON pam_knowledge_usage_log
FOR ALL USING (true);
