-- AI Model Fine-tuning Infrastructure
-- Tables for collecting training data, user feedback, and model management

-- 1. Training Data Collection
CREATE TABLE IF NOT EXISTS public.ai_training_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  conversation_type TEXT CHECK (conversation_type IN ('pam_chat', 'support', 'planning', 'recommendations', 'general')) NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_data JSONB DEFAULT '{}', -- User location, current activity, preferences
  quality_score NUMERIC(3,2), -- 0.00 to 5.00 rating
  feedback_type TEXT CHECK (feedback_type IN ('positive', 'negative', 'neutral', 'correction')),
  user_correction TEXT, -- If user provided a correction
  intent_classification TEXT,
  entities_extracted JSONB DEFAULT '{}',
  response_time_ms INTEGER,
  model_version TEXT,
  is_training_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Feedback Collection
CREATE TABLE IF NOT EXISTS public.ai_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_training_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'rating', 'correction', 'suggestion')) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  correction_text TEXT,
  suggestion_text TEXT,
  feedback_category TEXT CHECK (feedback_category IN ('accuracy', 'helpfulness', 'relevance', 'completeness', 'tone', 'safety')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Domain-Specific Knowledge Base
CREATE TABLE IF NOT EXISTS public.rv_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT CHECK (category IN ('maintenance', 'travel_tips', 'camping_spots', 'regulations', 'equipment', 'troubleshooting', 'routes', 'safety')) NOT NULL,
  subcategory TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  confidence_score NUMERIC(3,2) DEFAULT 0.00, -- How confident we are in this knowledge
  source_type TEXT CHECK (source_type IN ('user_generated', 'expert_verified', 'official_documentation', 'community_consensus')),
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'disputed', 'outdated')) DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  effectiveness_score NUMERIC(3,2) DEFAULT 0.00, -- How effective this knowledge is in responses
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Model Performance Tracking
CREATE TABLE IF NOT EXISTS public.ai_model_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performance_metrics JSONB NOT NULL, -- accuracy, response_time, user_satisfaction, etc.
  test_dataset_id UUID,
  domain_expertise_score NUMERIC(3,2), -- How well it performs on RV-specific queries
  general_performance_score NUMERIC(3,2),
  user_satisfaction_score NUMERIC(3,2),
  response_relevance_score NUMERIC(3,2),
  knowledge_accuracy_score NUMERIC(3,2),
  improvement_areas TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Training Datasets
CREATE TABLE IF NOT EXISTS public.ai_training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dataset_type TEXT CHECK (dataset_type IN ('conversations', 'q_and_a', 'knowledge_base', 'user_corrections', 'domain_specific')) NOT NULL,
  domain_focus TEXT CHECK (domain_focus IN ('rv_maintenance', 'travel_planning', 'camping_advice', 'route_optimization', 'equipment_recommendations', 'general_rv_knowledge')),
  data_source JSONB NOT NULL, -- References to conversations, knowledge base entries, etc.
  quality_threshold NUMERIC(3,2) DEFAULT 3.00, -- Minimum quality score for inclusion
  size_metrics JSONB DEFAULT '{}', -- number of examples, tokens, etc.
  preprocessing_applied TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_used_for_training TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Reinforcement Learning Events
CREATE TABLE IF NOT EXISTS public.rl_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_training_conversations(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('reward', 'penalty', 'exploration', 'exploitation')) NOT NULL,
  reward_score NUMERIC(5,2), -- Can be negative for penalties
  reward_reason TEXT,
  action_taken TEXT, -- What the AI did
  user_response TEXT, -- How the user responded
  context_state JSONB DEFAULT '{}', -- State when action was taken
  learning_weight NUMERIC(3,2) DEFAULT 1.00, -- How much to weight this learning event
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Model Fine-tuning Jobs
CREATE TABLE IF NOT EXISTS public.ai_finetuning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  base_model TEXT NOT NULL,
  dataset_id UUID REFERENCES public.ai_training_datasets(id) ON DELETE CASCADE,
  job_status TEXT CHECK (job_status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  job_config JSONB NOT NULL, -- training parameters, hyperparameters
  progress_percentage INTEGER DEFAULT 0,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  actual_completion TIMESTAMP WITH TIME ZONE,
  resulting_model_id TEXT, -- ID of the fine-tuned model
  performance_improvement JSONB, -- Before/after metrics
  cost_estimate NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  error_message TEXT,
  logs TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.ai_training_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rv_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rl_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_finetuning_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Training Conversations
CREATE POLICY "Users can view their own training conversations"
  ON public.ai_training_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "AI system can create training conversations"
  ON public.ai_training_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their conversation feedback"
  ON public.ai_training_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all training conversations"
  ON public.ai_training_conversations FOR ALL
  USING (is_admin_user(auth.uid()));

-- Feedback Events
CREATE POLICY "Users can manage their own feedback"
  ON public.ai_feedback_events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.ai_feedback_events FOR SELECT
  USING (is_admin_user(auth.uid()));

-- RV Knowledge Base
CREATE POLICY "Users can view verified knowledge"
  ON public.rv_knowledge_base FOR SELECT
  USING (verification_status = 'verified' OR auth.uid() = created_by);

CREATE POLICY "Users can contribute knowledge"
  ON public.rv_knowledge_base FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own knowledge entries"
  ON public.rv_knowledge_base FOR UPDATE
  USING (auth.uid() = created_by OR is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage knowledge base"
  ON public.rv_knowledge_base FOR ALL
  USING (is_admin_user(auth.uid()));

-- Model Performance
CREATE POLICY "Admins can manage model performance data"
  ON public.ai_model_performance FOR ALL
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view general performance metrics"
  ON public.ai_model_performance FOR SELECT
  USING (true);

-- Training Datasets
CREATE POLICY "Admins can manage training datasets"
  ON public.ai_training_datasets FOR ALL
  USING (is_admin_user(auth.uid()));

-- RL Learning Events
CREATE POLICY "Users can view their own RL events"
  ON public.rl_learning_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_training_conversations atc
      WHERE atc.id = rl_learning_events.conversation_id
      AND atc.user_id = auth.uid()
    )
  );

CREATE POLICY "AI system can create RL events"
  ON public.rl_learning_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_training_conversations atc
      WHERE atc.id = rl_learning_events.conversation_id
      AND atc.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage RL events"
  ON public.rl_learning_events FOR ALL
  USING (is_admin_user(auth.uid()));

-- Fine-tuning Jobs
CREATE POLICY "Admins can manage fine-tuning jobs"
  ON public.ai_finetuning_jobs FOR ALL
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view job status"
  ON public.ai_finetuning_jobs FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_conversations_user ON public.ai_training_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_training_conversations_session ON public.ai_training_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_training_conversations_type ON public.ai_training_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_training_conversations_quality ON public.ai_training_conversations(quality_score);
CREATE INDEX IF NOT EXISTS idx_training_conversations_approved ON public.ai_training_conversations(is_training_approved);

CREATE INDEX IF NOT EXISTS idx_feedback_events_conversation ON public.ai_feedback_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_user ON public.ai_feedback_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_type ON public.ai_feedback_events(feedback_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.rv_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_verification ON public.rv_knowledge_base(verification_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON public.rv_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_usage ON public.rv_knowledge_base(usage_count);

CREATE INDEX IF NOT EXISTS idx_model_performance_version ON public.ai_model_performance(model_version);
CREATE INDEX IF NOT EXISTS idx_model_performance_date ON public.ai_model_performance(evaluation_date);

CREATE INDEX IF NOT EXISTS idx_datasets_type ON public.ai_training_datasets(dataset_type);
CREATE INDEX IF NOT EXISTS idx_datasets_domain ON public.ai_training_datasets(domain_focus);
CREATE INDEX IF NOT EXISTS idx_datasets_active ON public.ai_training_datasets(is_active);

CREATE INDEX IF NOT EXISTS idx_rl_events_conversation ON public.rl_learning_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rl_events_type ON public.rl_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rl_events_processed ON public.rl_learning_events(is_processed);

CREATE INDEX IF NOT EXISTS idx_finetuning_jobs_status ON public.ai_finetuning_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_finetuning_jobs_dataset ON public.ai_finetuning_jobs(dataset_id);

-- Functions for AI Model Management

-- Function to calculate model performance score
CREATE OR REPLACE FUNCTION public.calculate_model_performance_score(
  model_version_param TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_quality NUMERIC;
  positive_feedback_ratio NUMERIC;
  response_accuracy NUMERIC;
  final_score NUMERIC;
BEGIN
  -- Calculate average quality score for conversations using this model
  SELECT AVG(quality_score)
  INTO avg_quality
  FROM ai_training_conversations
  WHERE model_version = model_version_param
    AND quality_score IS NOT NULL;
  
  -- Calculate positive feedback ratio
  SELECT 
    COUNT(*) FILTER (WHERE feedback_type = 'positive') * 100.0 / 
    NULLIF(COUNT(*), 0)
  INTO positive_feedback_ratio
  FROM ai_training_conversations
  WHERE model_version = model_version_param
    AND feedback_type IS NOT NULL;
  
  -- Calculate response accuracy based on corrections
  SELECT 
    (COUNT(*) - COUNT(*) FILTER (WHERE user_correction IS NOT NULL)) * 100.0 / 
    NULLIF(COUNT(*), 0)
  INTO response_accuracy
  FROM ai_training_conversations
  WHERE model_version = model_version_param;
  
  -- Combine scores (weighted average)
  final_score := (
    COALESCE(avg_quality, 0) * 0.4 +
    COALESCE(positive_feedback_ratio, 0) * 0.01 * 0.3 +
    COALESCE(response_accuracy, 0) * 0.01 * 0.3
  );
  
  RETURN GREATEST(0, LEAST(5, final_score));
END;
$$;

-- Function to process reinforcement learning events
CREATE OR REPLACE FUNCTION public.process_rl_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  processed_count INTEGER := 0;
  rl_event RECORD;
BEGIN
  -- Process unprocessed RL events
  FOR rl_event IN 
    SELECT * FROM rl_learning_events 
    WHERE is_processed = FALSE
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    -- Update the associated conversation with RL insights
    UPDATE ai_training_conversations
    SET 
      quality_score = CASE 
        WHEN rl_event.reward_score > 0 THEN 
          LEAST(5.0, COALESCE(quality_score, 3.0) + (rl_event.reward_score * 0.1))
        ELSE 
          GREATEST(0.0, COALESCE(quality_score, 3.0) + (rl_event.reward_score * 0.1))
      END,
      feedback_type = CASE 
        WHEN rl_event.reward_score > 0 THEN 'positive'
        WHEN rl_event.reward_score < 0 THEN 'negative'
        ELSE feedback_type
      END,
      updated_at = NOW()
    WHERE id = rl_event.conversation_id;
    
    -- Mark as processed
    UPDATE rl_learning_events
    SET 
      is_processed = TRUE,
      processed_at = NOW()
    WHERE id = rl_event.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$;

-- Function to generate training dataset
CREATE OR REPLACE FUNCTION public.generate_training_dataset(
  dataset_name_param TEXT,
  domain_focus_param TEXT DEFAULT NULL,
  quality_threshold_param NUMERIC DEFAULT 3.0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dataset_id UUID;
  conversation_count INTEGER;
  knowledge_count INTEGER;
BEGIN
  -- Create the dataset record
  INSERT INTO ai_training_datasets (
    name,
    description,
    dataset_type,
    domain_focus,
    quality_threshold,
    data_source,
    size_metrics
  ) VALUES (
    dataset_name_param,
    'Auto-generated training dataset based on user interactions',
    'conversations',
    domain_focus_param,
    quality_threshold_param,
    jsonb_build_object(
      'conversations_table', 'ai_training_conversations',
      'knowledge_table', 'rv_knowledge_base',
      'filters', jsonb_build_object(
        'quality_threshold', quality_threshold_param,
        'domain_focus', domain_focus_param,
        'training_approved', true
      )
    ),
    jsonb_build_object()
  ) RETURNING id INTO dataset_id;
  
  -- Count relevant conversations
  SELECT COUNT(*)
  INTO conversation_count
  FROM ai_training_conversations
  WHERE 
    quality_score >= quality_threshold_param
    AND is_training_approved = TRUE
    AND (domain_focus_param IS NULL OR conversation_type = domain_focus_param);
  
  -- Count relevant knowledge base entries
  SELECT COUNT(*)
  INTO knowledge_count
  FROM rv_knowledge_base
  WHERE 
    verification_status = 'verified'
    AND (domain_focus_param IS NULL OR category = domain_focus_param);
  
  -- Update size metrics
  UPDATE ai_training_datasets
  SET size_metrics = jsonb_build_object(
    'conversation_count', conversation_count,
    'knowledge_count', knowledge_count,
    'total_examples', conversation_count + knowledge_count,
    'generated_at', NOW()
  )
  WHERE id = dataset_id;
  
  RETURN dataset_id;
END;
$$;