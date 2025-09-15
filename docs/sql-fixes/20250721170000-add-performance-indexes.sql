-- Add Performance Indexes for Frequently Queried Columns
-- Migration: 20250721170000-add-performance-indexes.sql

-- User-related indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Trip Planning indexes
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_created_at ON user_trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_trips_user_status ON user_trips(user_id, status);

CREATE INDEX IF NOT EXISTS idx_trip_routes_trip_id ON trip_routes(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_routes_user_id ON trip_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_route_id ON trip_waypoints(route_id);
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_order ON trip_waypoints(waypoint_order);

-- Expense tracking indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_user_id ON trip_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_date ON trip_expenses(expense_date DESC);

-- Vehicle maintenance indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_date ON maintenance_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(maintenance_type);

-- Fuel log indexes
CREATE INDEX IF NOT EXISTS idx_fuel_log_user_id ON fuel_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_vehicle_id ON fuel_log(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_log_date ON fuel_log(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_log_user_date ON fuel_log(user_id, logged_at DESC);

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_user_created ON social_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON social_posts(visibility);

CREATE INDEX IF NOT EXISTS idx_user_friendships_user_id ON user_friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_friend_id ON user_friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_friendships_status ON user_friendships(status);
CREATE INDEX IF NOT EXISTS idx_user_friendships_user_status ON user_friendships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_id ON user_follows(followed_id);

-- Chat and messaging indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Calendar and events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

-- Marketplace indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price ON marketplace_listings(price);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_status ON marketplace_listings(category, status);

CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_listing_id ON user_wishlists(listing_id);

-- Affiliate and revenue indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_id ON affiliate_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_sale_date ON affiliate_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_user_date ON affiliate_sales(user_id, sale_date DESC);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_setting_name ON user_settings(setting_name);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_setting ON user_settings(user_id, setting_name);

-- Authentication and session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, expires_at) WHERE expires_at > NOW();

-- Product and order indexes (if they exist)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_activity_summary ON social_posts(user_id, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_planning_active ON user_trips(user_id, status) WHERE status IN ('active', 'planning');
CREATE INDEX IF NOT EXISTS idx_recent_maintenance ON maintenance_records(user_id, date DESC, maintenance_type);
CREATE INDEX IF NOT EXISTS idx_expense_summary ON expenses(user_id, date DESC, category);
CREATE INDEX IF NOT EXISTS idx_fuel_efficiency ON fuel_log(user_id, vehicle_id, logged_at DESC);

-- Spatial indexes for geolocation data (PostGIS)
CREATE INDEX IF NOT EXISTS idx_trip_waypoints_location ON trip_waypoints USING GIST(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_routes_start_location ON trip_routes USING GIST(start_location) WHERE start_location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_routes_end_location ON trip_routes USING GIST(end_location) WHERE end_location IS NOT NULL;

-- Full-text search indexes for searchable content
CREATE INDEX IF NOT EXISTS idx_social_posts_content_search ON social_posts USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_search ON marketplace_listings USING GIN(to_tsvector('english', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_maintenance_records_search ON maintenance_records USING GIN(to_tsvector('english', description));

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_created_at_range_profiles ON profiles(created_at) WHERE created_at > NOW() - INTERVAL '1 year';
CREATE INDEX IF NOT EXISTS idx_updated_at_range_conversations ON conversations(updated_at) WHERE updated_at > NOW() - INTERVAL '30 days';

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_active_trips ON user_trips(user_id, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_unread_notifications ON notifications(user_id, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_pending_friendships ON user_friendships(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_active_listings ON marketplace_listings(category, price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recent_posts ON social_posts(user_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '7 days';

-- Statistics and analytics indexes
CREATE INDEX IF NOT EXISTS idx_monthly_expenses ON expenses(user_id, date_trunc('month', date), category);
CREATE INDEX IF NOT EXISTS idx_weekly_fuel ON fuel_log(user_id, date_trunc('week', logged_at));
CREATE INDEX IF NOT EXISTS idx_daily_activity ON social_posts(user_id, date_trunc('day', created_at));

COMMENT ON INDEX idx_profiles_user_id IS 'Primary user lookup index';
COMMENT ON INDEX idx_user_trips_user_status IS 'Trip filtering by user and status';
COMMENT ON INDEX idx_expenses_user_date IS 'Expense history queries';
COMMENT ON INDEX idx_maintenance_records_user_date IS 'Maintenance history queries';
COMMENT ON INDEX idx_social_posts_user_created IS 'Social feed generation';
COMMENT ON INDEX idx_notifications_user_read IS 'Notification management';
COMMENT ON INDEX idx_marketplace_listings_category_status IS 'Marketplace browsing';
COMMENT ON INDEX idx_trip_waypoints_location IS 'Geospatial trip queries';
COMMENT ON INDEX idx_social_posts_content_search IS 'Full-text search on posts';
COMMENT ON INDEX idx_active_trips IS 'Active trip management';
COMMENT ON INDEX idx_monthly_expenses IS 'Monthly expense analytics';