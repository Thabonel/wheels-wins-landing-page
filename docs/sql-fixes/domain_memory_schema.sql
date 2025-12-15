CREATE TABLE domain_memory_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    scope TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'initializing', 'in_progress', 'completed', 'failed', 'paused')),
    CONSTRAINT valid_scope CHECK (scope IN ('user', 'system')),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

CREATE TABLE domain_memory_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES domain_memory_tasks(id) ON DELETE CASCADE UNIQUE,
    original_request TEXT NOT NULL,
    parsed_intent JSONB NOT NULL,
    work_items JSONB NOT NULL,
    success_criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE domain_memory_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES domain_memory_tasks(id) ON DELETE CASCADE UNIQUE,
    current_work_item_id TEXT,
    completed_items TEXT[] DEFAULT '{}',
    failed_items TEXT[] DEFAULT '{}',
    blocked_items TEXT[] DEFAULT '{}',
    context_snapshot JSONB,
    last_worker_run TIMESTAMPTZ,
    worker_run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE domain_memory_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES domain_memory_tasks(id) ON DELETE CASCADE,
    worker_run_id UUID NOT NULL,
    entry_type TEXT NOT NULL,
    work_item_id TEXT,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_entry_type CHECK (entry_type IN ('action', 'decision', 'error', 'milestone', 'rollback'))
);

CREATE TABLE domain_memory_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES domain_memory_tasks(id) ON DELETE CASCADE UNIQUE,
    budget_constraints JSONB,
    time_constraints JSONB,
    scope_constraints JSONB,
    safety_rules TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE domain_memory_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES domain_memory_tasks(id) ON DELETE CASCADE UNIQUE,
    test_cases JSONB NOT NULL,
    validation_queries TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status ON domain_memory_tasks(user_id, status);
CREATE INDEX idx_tasks_scope_status ON domain_memory_tasks(scope, status);
CREATE INDEX idx_tasks_priority ON domain_memory_tasks(priority DESC);
CREATE INDEX idx_progress_task_created ON domain_memory_progress(task_id, created_at);
CREATE INDEX idx_progress_worker_run ON domain_memory_progress(worker_run_id);

ALTER TABLE domain_memory_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_memory_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_memory_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_memory_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_memory_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_memory_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" ON domain_memory_tasks
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR scope = 'system');

CREATE POLICY "Users can manage own definitions" ON domain_memory_definitions
    FOR ALL TO authenticated
    USING (task_id IN (SELECT id FROM domain_memory_tasks WHERE user_id = auth.uid() OR scope = 'system'));

CREATE POLICY "Users can manage own states" ON domain_memory_states
    FOR ALL TO authenticated
    USING (task_id IN (SELECT id FROM domain_memory_tasks WHERE user_id = auth.uid() OR scope = 'system'));

CREATE POLICY "Users can manage own progress" ON domain_memory_progress
    FOR ALL TO authenticated
    USING (task_id IN (SELECT id FROM domain_memory_tasks WHERE user_id = auth.uid() OR scope = 'system'));

CREATE POLICY "Users can manage own constraints" ON domain_memory_constraints
    FOR ALL TO authenticated
    USING (task_id IN (SELECT id FROM domain_memory_tasks WHERE user_id = auth.uid() OR scope = 'system'));

CREATE POLICY "Users can manage own tests" ON domain_memory_tests
    FOR ALL TO authenticated
    USING (task_id IN (SELECT id FROM domain_memory_tasks WHERE user_id = auth.uid() OR scope = 'system'));

GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_constraints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON domain_memory_tests TO authenticated;

CREATE OR REPLACE FUNCTION update_domain_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON domain_memory_tasks
    FOR EACH ROW EXECUTE FUNCTION update_domain_memory_updated_at();

CREATE TRIGGER trigger_definitions_updated_at
    BEFORE UPDATE ON domain_memory_definitions
    FOR EACH ROW EXECUTE FUNCTION update_domain_memory_updated_at();

CREATE TRIGGER trigger_states_updated_at
    BEFORE UPDATE ON domain_memory_states
    FOR EACH ROW EXECUTE FUNCTION update_domain_memory_updated_at();

CREATE TRIGGER trigger_constraints_updated_at
    BEFORE UPDATE ON domain_memory_constraints
    FOR EACH ROW EXECUTE FUNCTION update_domain_memory_updated_at();

CREATE TRIGGER trigger_tests_updated_at
    BEFORE UPDATE ON domain_memory_tests
    FOR EACH ROW EXECUTE FUNCTION update_domain_memory_updated_at();
