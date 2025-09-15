-- PAM Phase 7: Ecosystem Integration & External APIs Database Schema
-- Creates comprehensive database schema for all external integrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Travel & Booking Integration Tables

-- Travel searches table
CREATE TABLE IF NOT EXISTS pam_travel_searches (
    search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    booking_type TEXT NOT NULL CHECK (booking_type IN (
        'accommodation', 'flights', 'car_rental', 'caravan_parks',
        'tours', 'activities', 'restaurants', 'fuel_stops'
    )),
    destination TEXT NOT NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    guests INTEGER NOT NULL DEFAULT 2,
    budget_range JSONB NOT NULL DEFAULT '[0, 1000]',
    preferences JSONB NOT NULL DEFAULT '{}',
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_travel_searches_user (user_id),
    INDEX idx_travel_searches_type (booking_type),
    INDEX idx_travel_searches_destination (destination),
    INDEX idx_travel_searches_dates (check_in, check_out),
    INDEX gin_travel_searches_preferences (preferences)
);

-- Travel bookings table
CREATE TABLE IF NOT EXISTS pam_travel_bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    booking_type TEXT NOT NULL,
    confirmation_id TEXT NOT NULL,
    booking_reference TEXT NOT NULL,
    traveler_details JSONB NOT NULL DEFAULT '{}',
    booking_details JSONB NOT NULL DEFAULT '{}',
    total_cost DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    status TEXT NOT NULL DEFAULT 'confirmed',
    booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancellation_deadline TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_travel_bookings_user (user_id),
    INDEX idx_travel_bookings_provider (provider),
    INDEX idx_travel_bookings_status (status),
    INDEX idx_travel_bookings_date (booking_date)
);

-- Travel API credentials table (encrypted)
CREATE TABLE IF NOT EXISTS pam_travel_api_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    credentials TEXT NOT NULL, -- encrypted JSON
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Financial Data Integration Tables

-- Bank accounts table
CREATE TABLE IF NOT EXISTS pam_bank_accounts (
    account_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    account_number TEXT NOT NULL, -- encrypted
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN (
        'transaction', 'savings', 'term_deposit', 'credit_card',
        'home_loan', 'personal_loan', 'business', 'joint', 'investment'
    )),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    available_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'AUD',
    bsb TEXT,
    product_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_bank_accounts_user (user_id),
    INDEX idx_bank_accounts_provider (provider),
    INDEX idx_bank_accounts_type (account_type),
    INDEX idx_bank_accounts_active (is_active)
);

-- Financial transactions table
CREATE TABLE IF NOT EXISTS pam_financial_transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'debit', 'credit', 'transfer', 'payment', 'withdrawal', 'deposit'
    )),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    subcategory TEXT,
    merchant_name TEXT,
    merchant_location TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    posted_date TIMESTAMPTZ NOT NULL,
    balance_after DECIMAL(10,2),
    reference TEXT,
    is_travel_related BOOLEAN NOT NULL DEFAULT false,
    location_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    FOREIGN KEY (account_id) REFERENCES pam_bank_accounts(account_id),
    
    -- Indexes
    INDEX idx_transactions_account (account_id),
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_type (transaction_type),
    INDEX idx_transactions_category (category),
    INDEX idx_transactions_date (transaction_date),
    INDEX idx_transactions_travel (is_travel_related),
    INDEX gin_transactions_metadata (metadata)
);

-- Financial credentials table (encrypted)
CREATE TABLE IF NOT EXISTS pam_financial_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    
    UNIQUE(user_id, provider),
    INDEX idx_financial_credentials_user (user_id)
);

-- IoT Device Integration Tables

-- IoT devices table
CREATE TABLE IF NOT EXISTS pam_iot_devices (
    device_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    name TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    firmware_version TEXT,
    connection_protocol TEXT NOT NULL,
    connection_details JSONB NOT NULL DEFAULT '{}',
    capabilities JSONB NOT NULL DEFAULT '[]',
    sensors JSONB NOT NULL DEFAULT '[]',
    actuators JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'offline',
    last_seen TIMESTAMPTZ,
    battery_level DECIMAL(3,2), -- 0-1 range
    signal_strength DECIMAL(3,2), -- 0-1 range
    location JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_iot_devices_user (user_id),
    INDEX idx_iot_devices_type (device_type),
    INDEX idx_iot_devices_status (status),
    INDEX idx_iot_devices_last_seen (last_seen),
    INDEX gin_iot_devices_capabilities (capabilities)
);

-- Device readings table
CREATE TABLE IF NOT EXISTS pam_device_readings (
    reading_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    sensor_type TEXT NOT NULL,
    value JSONB NOT NULL, -- Can be number, string, boolean, or object
    unit TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quality DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- 0-1 confidence
    metadata JSONB NOT NULL DEFAULT '{}',
    
    FOREIGN KEY (device_id) REFERENCES pam_iot_devices(device_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_device_readings_device (device_id),
    INDEX idx_device_readings_type (sensor_type),
    INDEX idx_device_readings_timestamp (timestamp),
    INDEX idx_device_readings_quality (quality)
);

-- Device alerts table
CREATE TABLE IF NOT EXISTS pam_device_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendations JSONB NOT NULL DEFAULT '[]',
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    FOREIGN KEY (device_id) REFERENCES pam_iot_devices(device_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_device_alerts_device (device_id),
    INDEX idx_device_alerts_user (user_id),
    INDEX idx_device_alerts_severity (severity),
    INDEX idx_device_alerts_triggered (triggered_at),
    INDEX idx_device_alerts_resolved (resolved_at)
);

-- Automation rules table
CREATE TABLE IF NOT EXISTS pam_automation_rules (
    rule_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    
    -- Indexes
    INDEX idx_automation_rules_user (user_id),
    INDEX idx_automation_rules_active (is_active),
    INDEX idx_automation_rules_last_triggered (last_triggered)
);

-- Social Media Integration Tables

-- Social accounts table
CREATE TABLE IF NOT EXISTS pam_social_accounts (
    account_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    profile_picture TEXT,
    follower_count INTEGER,
    following_count INTEGER,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_business_account BOOLEAN NOT NULL DEFAULT false,
    access_token TEXT NOT NULL, -- encrypted
    refresh_token TEXT, -- encrypted
    token_expires TIMESTAMPTZ,
    permissions JSONB NOT NULL DEFAULT '[]',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    
    UNIQUE(user_id, platform),
    
    -- Indexes
    INDEX idx_social_accounts_user (user_id),
    INDEX idx_social_accounts_platform (platform),
    INDEX idx_social_accounts_connected (connected_at)
);

-- Social posts table
CREATE TABLE IF NOT EXISTS pam_social_posts (
    post_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,
    title TEXT,
    text_content TEXT,
    media_urls JSONB NOT NULL DEFAULT '[]',
    hashtags JSONB NOT NULL DEFAULT '[]',
    mentions JSONB NOT NULL DEFAULT '[]',
    location JSONB,
    privacy_level TEXT NOT NULL DEFAULT 'public',
    scheduled_time TIMESTAMPTZ,
    posted_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft',
    engagement_metrics JSONB NOT NULL DEFAULT '{}',
    platform_post_id TEXT,
    platform_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (account_id) REFERENCES pam_social_accounts(account_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_social_posts_account (account_id),
    INDEX idx_social_posts_user (user_id),
    INDEX idx_social_posts_platform (platform),
    INDEX idx_social_posts_status (status),
    INDEX idx_social_posts_scheduled (scheduled_time),
    INDEX idx_social_posts_posted (posted_time)
);

-- Travel stories table
CREATE TABLE IF NOT EXISTS pam_travel_stories (
    story_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_id TEXT,
    location JSONB NOT NULL DEFAULT '{}',
    content JSONB NOT NULL DEFAULT '{}',
    media JSONB NOT NULL DEFAULT '[]',
    suggested_platforms JSONB NOT NULL DEFAULT '[]',
    hashtags JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_travel_stories_user (user_id),
    INDEX idx_travel_stories_template (template_id),
    INDEX idx_travel_stories_status (status),
    INDEX idx_travel_stories_created (created_at)
);

-- Marketplace & E-commerce Integration Tables

-- Marketplace searches table
CREATE TABLE IF NOT EXISTS pam_marketplace_searches (
    search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    query TEXT NOT NULL,
    category TEXT,
    providers JSONB NOT NULL DEFAULT '[]',
    filters JSONB NOT NULL DEFAULT '{}',
    result_count INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_type TEXT NOT NULL DEFAULT 'product_search',
    
    -- Indexes
    INDEX idx_marketplace_searches_user (user_id),
    INDEX idx_marketplace_searches_query (query),
    INDEX idx_marketplace_searches_category (category),
    INDEX idx_marketplace_searches_timestamp (timestamp)
);

-- Shopping carts table
CREATE TABLE IF NOT EXISTS pam_shopping_carts (
    cart_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'AUD',
    shipping_address JSONB,
    estimated_delivery TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, provider),
    
    -- Indexes
    INDEX idx_shopping_carts_user (user_id),
    INDEX idx_shopping_carts_provider (provider),
    INDEX idx_shopping_carts_updated (last_updated)
);

-- Orders table
CREATE TABLE IF NOT EXISTS pam_orders (
    order_id TEXT PRIMARY KEY,
    provider_order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    status TEXT NOT NULL DEFAULT 'pending',
    shipping_address JSONB NOT NULL DEFAULT '{}',
    billing_address JSONB NOT NULL DEFAULT '{}',
    payment_method TEXT,
    tracking_number TEXT,
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_provider (provider),
    INDEX idx_orders_status (status),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_tracking (tracking_number)
);

-- Price alerts table
CREATE TABLE IF NOT EXISTS pam_price_alerts (
    alert_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    target_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    price_drop_percentage DECIMAL(5,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_at TIMESTAMPTZ,
    alert_preferences JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_price_alerts_user (user_id),
    INDEX idx_price_alerts_product (product_id),
    INDEX idx_price_alerts_active (is_active),
    INDEX idx_price_alerts_triggered (triggered_at)
);

-- Developer API & SDK Tables

-- Developer apps table
CREATE TABLE IF NOT EXISTS pam_developer_apps (
    app_id TEXT PRIMARY KEY,
    developer_id TEXT NOT NULL,
    app_name TEXT NOT NULL,
    description TEXT,
    app_type TEXT NOT NULL,
    api_tier TEXT NOT NULL DEFAULT 'free',
    scopes JSONB NOT NULL DEFAULT '[]',
    api_key TEXT NOT NULL UNIQUE,
    webhook_url TEXT,
    webhook_secret TEXT,
    rate_limits JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_developer_apps_developer (developer_id),
    INDEX idx_developer_apps_api_key (api_key),
    INDEX idx_developer_apps_tier (api_tier),
    INDEX idx_developer_apps_active (is_active)
);

-- API requests table
CREATE TABLE IF NOT EXISTS pam_api_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    request_size INTEGER NOT NULL DEFAULT 0,
    response_size INTEGER NOT NULL DEFAULT 0,
    user_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    FOREIGN KEY (app_id) REFERENCES pam_developer_apps(app_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_api_requests_app (app_id),
    INDEX idx_api_requests_endpoint (endpoint),
    INDEX idx_api_requests_timestamp (timestamp),
    INDEX idx_api_requests_status (status_code)
);

-- Webhook deliveries table
CREATE TABLE IF NOT EXISTS pam_webhook_deliveries (
    delivery_id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    webhook_url TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
    response_code INTEGER,
    response_body TEXT,
    
    FOREIGN KEY (app_id) REFERENCES pam_developer_apps(app_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_webhook_deliveries_app (app_id),
    INDEX idx_webhook_deliveries_status (status),
    INDEX idx_webhook_deliveries_next_retry (next_retry),
    INDEX idx_webhook_deliveries_event (event_type)
);

-- RLS Policies for External Integration Tables

-- Enable RLS on integration tables
ALTER TABLE pam_travel_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_travel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_financial_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_device_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_device_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_travel_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_marketplace_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_developer_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pam_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- User-specific data access policies
CREATE POLICY "Users can access their own travel data"
ON pam_travel_searches FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own bookings"
ON pam_travel_bookings FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own bank accounts"
ON pam_bank_accounts FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own transactions"
ON pam_financial_transactions FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own financial credentials"
ON pam_financial_credentials FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own IoT devices"
ON pam_iot_devices FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own device readings"
ON pam_device_readings FOR ALL
USING (device_id IN (SELECT device_id FROM pam_iot_devices WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can access their own device alerts"
ON pam_device_alerts FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own automation rules"
ON pam_automation_rules FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own social accounts"
ON pam_social_accounts FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own social posts"
ON pam_social_posts FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own travel stories"
ON pam_travel_stories FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own marketplace searches"
ON pam_marketplace_searches FOR ALL
USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their own shopping carts"
ON pam_shopping_carts FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own orders"
ON pam_orders FOR ALL
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can access their own price alerts"
ON pam_price_alerts FOR ALL
USING (auth.uid()::text = user_id);

-- Developer-specific policies
CREATE POLICY "Developers can access their own apps"
ON pam_developer_apps FOR ALL
USING (auth.uid()::text = developer_id);

CREATE POLICY "Apps can access their own API requests"
ON pam_api_requests FOR ALL
USING (app_id IN (SELECT app_id FROM pam_developer_apps WHERE developer_id = auth.uid()::text));

CREATE POLICY "Apps can access their own webhook deliveries"
ON pam_webhook_deliveries FOR ALL
USING (app_id IN (SELECT app_id FROM pam_developer_apps WHERE developer_id = auth.uid()::text));

-- Service role policies for system operations
CREATE POLICY "Service role full access to API credentials"
ON pam_travel_api_credentials FOR ALL
USING (auth.role() = 'service_role');

-- Functions for integration analytics

-- Function to get travel booking analytics
CREATE OR REPLACE FUNCTION get_travel_booking_analytics(
    p_user_id TEXT,
    p_days_back INTEGER DEFAULT 90
) RETURNS JSONB AS $$
DECLARE
    booking_stats JSONB;
    spending_analysis JSONB;
BEGIN
    -- Get booking statistics
    SELECT jsonb_build_object(
        'total_bookings', COUNT(*),
        'total_spent', SUM(total_cost),
        'average_booking_value', AVG(total_cost),
        'booking_types', jsonb_agg(DISTINCT booking_type),
        'providers_used', jsonb_agg(DISTINCT provider)
    )
    INTO booking_stats
    FROM pam_travel_bookings
    WHERE user_id = p_user_id
        AND booking_date > NOW() - (p_days_back || ' days')::INTERVAL;
    
    -- Get spending analysis by category
    SELECT jsonb_object_agg(booking_type, category_stats)
    INTO spending_analysis
    FROM (
        SELECT 
            booking_type,
            jsonb_build_object(
                'count', COUNT(*),
                'total_spent', SUM(total_cost),
                'average_cost', AVG(total_cost)
            ) as category_stats
        FROM pam_travel_bookings
        WHERE user_id = p_user_id
            AND booking_date > NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY booking_type
    ) subq;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'analysis_period_days', p_days_back,
        'booking_stats', booking_stats,
        'spending_by_category', spending_analysis,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get IoT device health summary
CREATE OR REPLACE FUNCTION get_iot_device_health(
    p_user_id TEXT
) RETURNS JSONB AS $$
DECLARE
    device_summary JSONB;
    alert_summary JSONB;
BEGIN
    -- Get device status summary
    SELECT jsonb_object_agg(status, count)
    INTO device_summary
    FROM (
        SELECT status, COUNT(*) as count
        FROM pam_iot_devices
        WHERE user_id = p_user_id
        GROUP BY status
    ) subq;
    
    -- Get recent alerts summary
    SELECT jsonb_build_object(
        'total_alerts', COUNT(*),
        'unresolved_alerts', COUNT(*) FILTER (WHERE resolved_at IS NULL),
        'critical_alerts', COUNT(*) FILTER (WHERE severity = 'critical' AND resolved_at IS NULL),
        'recent_alerts', COUNT(*) FILTER (WHERE triggered_at > NOW() - INTERVAL '24 hours')
    )
    INTO alert_summary
    FROM pam_device_alerts
    WHERE user_id = p_user_id
        AND triggered_at > NOW() - INTERVAL '30 days';
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'device_status_summary', device_summary,
        'alert_summary', alert_summary,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old integration data
CREATE OR REPLACE FUNCTION cleanup_integration_data(
    retention_days INTEGER DEFAULT 365
) RETURNS JSONB AS $$
DECLARE
    cleanup_stats JSONB := '{}'::JSONB;
    deleted_count INTEGER;
BEGIN
    -- Clean up old API requests
    DELETE FROM pam_api_requests 
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{api_requests_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up old device readings (keep last 90 days)
    DELETE FROM pam_device_readings 
    WHERE timestamp < NOW() - LEAST(retention_days, 90) || ' days'::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{device_readings_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up delivered webhooks
    DELETE FROM pam_webhook_deliveries 
    WHERE status = 'delivered' AND last_attempt < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{webhook_deliveries_deleted}', deleted_count::TEXT::JSONB);
    
    -- Clean up old marketplace searches
    DELETE FROM pam_marketplace_searches 
    WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    cleanup_stats := jsonb_set(cleanup_stats, '{marketplace_searches_deleted}', deleted_count::TEXT::JSONB);
    
    cleanup_stats := jsonb_set(cleanup_stats, '{cleanup_timestamp}', ('"' || NOW()::TEXT || '"')::JSONB);
    
    RETURN cleanup_stats;
END;
$$ LANGUAGE plpgsql;

-- Performance indexes for integration queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_travel_bookings_composite
ON pam_travel_bookings (user_id, booking_date DESC, total_cost);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_transactions_composite
ON pam_financial_transactions (user_id, transaction_date DESC, amount, is_travel_related);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_readings_composite
ON pam_device_readings (device_id, timestamp DESC, sensor_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_posts_composite
ON pam_social_posts (user_id, platform, posted_time DESC, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_requests_composite
ON pam_api_requests (app_id, timestamp DESC, status_code);

-- Comments for documentation
COMMENT ON TABLE pam_travel_searches IS 'Travel and booking search requests with results';
COMMENT ON TABLE pam_travel_bookings IS 'Confirmed travel bookings across all providers';
COMMENT ON TABLE pam_bank_accounts IS 'Connected bank accounts via Open Banking';
COMMENT ON TABLE pam_financial_transactions IS 'Synchronized financial transactions with categorization';
COMMENT ON TABLE pam_iot_devices IS 'Connected IoT devices and their configurations';
COMMENT ON TABLE pam_device_readings IS 'Sensor readings from connected IoT devices';
COMMENT ON TABLE pam_social_accounts IS 'Connected social media accounts';
COMMENT ON TABLE pam_social_posts IS 'Social media posts created through PAM';
COMMENT ON TABLE pam_shopping_carts IS 'Active shopping carts across marketplace providers';
COMMENT ON TABLE pam_orders IS 'Orders placed through marketplace integrations';
COMMENT ON TABLE pam_developer_apps IS 'Registered third-party developer applications';
COMMENT ON TABLE pam_api_requests IS 'API request logs for analytics and monitoring';