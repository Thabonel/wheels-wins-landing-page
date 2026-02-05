-- OpenClaw Systems Database Schemas
-- Created: 2026-02-03
-- Purpose: Support Universal Browser Automation, Site-Agnostic Data Extraction, and Dynamic Tool Generation

-- ============================================================
-- UNIVERSAL BROWSER AUTOMATION (USA) TABLES
-- ============================================================

-- Browser Sessions - tracks active browser sessions per user
CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    browser_context_data JSONB DEFAULT '{}'::jsonb,
    cookies JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    viewport_size JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb,

    -- Session state
    current_url TEXT,
    current_page_title TEXT,
    element_index JSONB DEFAULT '[]'::jsonb,

    -- Session management
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes',
    is_active BOOLEAN DEFAULT true,

    -- Performance tracking
    total_actions INTEGER DEFAULT 0,
    total_page_loads INTEGER DEFAULT 0,
    average_action_time_ms INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_user_active
    ON browser_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_browser_sessions_expires
    ON browser_sessions(expires_at) WHERE is_active = true;

-- Browser Automation Actions Log - tracks all actions for debugging and learning
CREATE TABLE IF NOT EXISTS browser_automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Action details
    action_type TEXT NOT NULL, -- navigate, click, type, extract, fill_form, scroll, screenshot
    url TEXT NOT NULL,
    intent TEXT, -- Natural language description
    parameters JSONB DEFAULT '{}'::jsonb,

    -- Execution details
    element_index INTEGER, -- Numeric element reference
    element_selector TEXT,
    element_metadata JSONB DEFAULT '{}'::jsonb,

    -- Results
    success BOOLEAN NOT NULL,
    result_data JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    execution_time_ms INTEGER,
    screenshot_url TEXT, -- S3 URL if screenshot taken

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_actions_user_time
    ON browser_automation_actions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_automation_actions_url_success
    ON browser_automation_actions(url, success);
CREATE INDEX IF NOT EXISTS idx_automation_actions_type
    ON browser_automation_actions(action_type);

-- Site Automation Patterns - cache successful automation strategies per site
CREATE TABLE IF NOT EXISTS site_automation_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    url_pattern TEXT,
    page_type TEXT, -- product, campground, form, listing, article

    -- Pattern data
    element_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
    form_field_mappings JSONB DEFAULT '{}'::jsonb,
    navigation_patterns JSONB DEFAULT '{}'::jsonb,
    extraction_selectors JSONB DEFAULT '{}'::jsonb,

    -- Pattern metadata
    success_rate DECIMAL(5,2) DEFAULT 0.0, -- 0-100%
    total_uses INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1.0

    -- Management
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_user_id UUID REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_patterns_domain_url
    ON site_automation_patterns(domain, url_pattern);
CREATE INDEX IF NOT EXISTS idx_site_patterns_domain
    ON site_automation_patterns(domain);
CREATE INDEX IF NOT EXISTS idx_site_patterns_success
    ON site_automation_patterns(success_rate) WHERE success_rate > 80.0;

-- User Automation Preferences - store form auto-fill data and settings
CREATE TABLE IF NOT EXISTS user_automation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

    -- Form auto-fill data
    form_fill_data JSONB DEFAULT '{
        "personal": {
            "first_name": null,
            "last_name": null,
            "email": null,
            "phone": null
        },
        "address": {
            "street": null,
            "city": null,
            "state": null,
            "zip": null,
            "country": "United States"
        },
        "rv_info": {
            "length": null,
            "type": null,
            "slides": null,
            "pets": false
        }
    }'::jsonb,

    -- Site-specific preferences
    site_preferences JSONB DEFAULT '{}'::jsonb,

    -- Automation settings
    auto_screenshot BOOLEAN DEFAULT true,
    auto_fill_forms BOOLEAN DEFAULT true,
    max_session_duration INTEGER DEFAULT 1800, -- 30 minutes
    preferred_viewport JSONB DEFAULT '{"width": 1920, "height": 1080}'::jsonb,

    -- Privacy settings
    save_cookies BOOLEAN DEFAULT true,
    save_form_data BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE-AGNOSTIC DATA EXTRACTION TABLES
-- ============================================================

-- Extraction Cache - cache extracted data from URLs
CREATE TABLE IF NOT EXISTS extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_hash TEXT NOT NULL, -- MD5 hash of URL + intent
    url TEXT NOT NULL,
    intent TEXT,

    -- Extraction results
    page_type TEXT, -- product, campground, business, article, comparison, listing
    extracted_data JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0,

    -- Metadata
    extraction_method TEXT, -- structural, semantic, hybrid
    processing_time_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extraction_cache_hash
    ON extraction_cache(url_hash);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_expires
    ON extraction_cache(expires_at);

-- Extraction Patterns - learned extraction strategies per domain
CREATE TABLE IF NOT EXISTS extraction_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    page_type TEXT NOT NULL,

    -- Pattern details
    selectors JSONB NOT NULL DEFAULT '{}'::jsonb, -- field -> CSS selector
    ai_hints JSONB DEFAULT '{}'::jsonb, -- field -> extraction hint
    element_indices JSONB DEFAULT '{}'::jsonb, -- field -> element indices
    schema_mapping JSONB DEFAULT '{}'::jsonb, -- raw field -> schema field

    -- Pattern quality
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_success TIMESTAMPTZ DEFAULT NOW(),
    confidence DECIMAL(3,2) DEFAULT 0.0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_extraction_patterns_domain_type
    ON extraction_patterns(domain, page_type);
CREATE INDEX IF NOT EXISTS idx_extraction_patterns_confidence
    ON extraction_patterns(confidence) WHERE confidence > 0.8;

-- Extraction Log - track all extraction attempts for analytics
CREATE TABLE IF NOT EXISTS extraction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    intent TEXT,

    -- Results
    success BOOLEAN NOT NULL,
    page_type TEXT,
    confidence DECIMAL(3,2),
    error_code TEXT,
    error_message TEXT,

    -- Performance
    total_time_ms INTEGER,
    render_time_ms INTEGER,
    extraction_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_log_user
    ON extraction_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_log_domain
    ON extraction_log(domain, success);

-- ============================================================
-- AI DYNAMIC TOOL GENERATION TABLES
-- ============================================================

-- Generated Tool Patterns - cache successful tool generations
CREATE TABLE IF NOT EXISTS generated_tool_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id TEXT UNIQUE NOT NULL,

    -- Intent matching
    intent_signature TEXT NOT NULL, -- Normalized intent
    intent_keywords TEXT[] DEFAULT '{}', -- Keywords for matching

    -- Tool definition
    template_used TEXT NOT NULL, -- api_integration, database_query, data_aggregation, external_scraper
    tool_name TEXT NOT NULL,
    tool_description TEXT NOT NULL,
    generated_code TEXT NOT NULL,
    function_definition JSONB NOT NULL, -- OpenAI function schema

    -- Quality tracking
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_execution_time_ms FLOAT DEFAULT 0.0,

    -- Management
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    is_promoted BOOLEAN DEFAULT false, -- Promoted to permanent tool
    promoted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generated_patterns_intent
    ON generated_tool_patterns(intent_signature);
CREATE INDEX IF NOT EXISTS idx_generated_patterns_active
    ON generated_tool_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_generated_patterns_success
    ON generated_tool_patterns(success_count) WHERE success_count > 5;

-- Tool Generation Log - audit trail for all generations
CREATE TABLE IF NOT EXISTS tool_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Request details
    intent TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,

    -- Generation details
    pattern_id UUID REFERENCES generated_tool_patterns(id),
    was_cached BOOLEAN DEFAULT false,
    template_used TEXT,

    -- Performance
    generation_time_ms FLOAT,
    validation_time_ms FLOAT,
    execution_time_ms FLOAT,

    -- Results
    success BOOLEAN NOT NULL,
    error_type TEXT,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_gen_log_user
    ON tool_generation_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_gen_log_success
    ON tool_generation_log(success, created_at);

-- Tool Security Violations - track any security issues
CREATE TABLE IF NOT EXISTS tool_security_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    violation_type TEXT NOT NULL, -- forbidden_import, injection_attempt, sandbox_escape, etc.
    intent TEXT,
    generated_code TEXT,
    violation_details JSONB NOT NULL,

    -- Response
    action_taken TEXT, -- blocked, flagged, admin_review

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_violations_type
    ON tool_security_violations(violation_type, created_at);

-- ============================================================
-- SITE PERFORMANCE METRICS (for optimization)
-- ============================================================

CREATE TABLE IF NOT EXISTS site_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    url_pattern TEXT,

    -- Performance metrics (aggregated)
    avg_page_load_ms INTEGER,
    avg_element_detection_ms INTEGER,
    avg_action_execution_ms INTEGER,
    avg_extraction_time_ms INTEGER,
    success_rate DECIMAL(5,2),

    -- Sample info
    sample_size INTEGER,
    date_range_start DATE,
    date_range_end DATE,
    last_calculated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_domain
    ON site_performance_metrics(domain);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_automation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_security_violations ENABLE ROW LEVEL SECURITY;

-- Policies for browser_sessions
CREATE POLICY browser_sessions_user_policy ON browser_sessions
    FOR ALL USING (user_id = auth.uid());

-- Policies for browser_automation_actions
CREATE POLICY automation_actions_user_policy ON browser_automation_actions
    FOR ALL USING (user_id = auth.uid());

-- Policies for user_automation_preferences
CREATE POLICY automation_prefs_user_policy ON user_automation_preferences
    FOR ALL USING (user_id = auth.uid());

-- Policies for extraction_log
CREATE POLICY extraction_log_user_policy ON extraction_log
    FOR ALL USING (user_id = auth.uid());

-- Policies for tool_generation_log
CREATE POLICY tool_gen_log_user_policy ON tool_generation_log
    FOR ALL USING (user_id = auth.uid());

-- Policies for tool_security_violations (users can view their own)
CREATE POLICY security_violations_user_policy ON tool_security_violations
    FOR SELECT USING (user_id = auth.uid());

-- Admin policies (for admin role)
CREATE POLICY browser_sessions_admin_policy ON browser_sessions
    FOR ALL TO admin USING (true);
CREATE POLICY automation_actions_admin_policy ON browser_automation_actions
    FOR ALL TO admin USING (true);
CREATE POLICY extraction_log_admin_policy ON extraction_log
    FOR ALL TO admin USING (true);
CREATE POLICY tool_gen_log_admin_policy ON tool_generation_log
    FOR ALL TO admin USING (true);
CREATE POLICY security_violations_admin_policy ON tool_security_violations
    FOR ALL TO admin USING (true);

-- Public read access to shared patterns (no user data)
ALTER TABLE site_automation_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_patterns_read_policy ON site_automation_patterns
    FOR SELECT USING (true);
CREATE POLICY site_patterns_write_policy ON site_automation_patterns
    FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

ALTER TABLE extraction_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_patterns_read_policy ON extraction_patterns
    FOR SELECT USING (true);

ALTER TABLE generated_tool_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_patterns_read_policy ON generated_tool_patterns
    FOR SELECT USING (true);

-- Cache tables are public (no sensitive data)
ALTER TABLE extraction_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY extraction_cache_public_policy ON extraction_cache
    FOR ALL USING (true);

ALTER TABLE site_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY performance_metrics_read_policy ON site_performance_metrics
    FOR SELECT USING (true);
