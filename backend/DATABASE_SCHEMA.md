# PAM Backend Database Schema Requirements

This document outlines all the database tables required for the PAM (Personal Assistant Manager) backend to function properly.

## Core Tables

### User Management
- `profiles` - User profile information
- `admin_users` - Administrative users
- `user_active_sessions` - Active user sessions

### PAM Core Functionality  
- `pam_analytics_logs` - Analytics and tracking data
- `pam_conversation_memory` - Conversation history and context
- `pam_conversation_sessions` - Active conversation sessions
- `pam_memory` - General PAM memory storage
- `pam_user_context` - User-specific context data

### Chat & Sessions
- `chat_sessions` - Chat session management (from our implementation)

### Financial Management
- `expenses` - User expense tracking
- `budgets` - User budget information
- `budget_categories` - Budget category definitions
- `income_entries` - User income tracking

### Vehicle & Maintenance
- `maintenance_records` - Vehicle maintenance tracking
- `fuel_log` - Fuel consumption logging
- `fuel_stations` - Fuel station locations

### Location & Travel
- `local_events` - Local events and activities
- `camping_locations` - Camping spot information
- `calendar_events` - User calendar events

### Business & Hustles
- `youtube_hustles` - YouTube business opportunities
- `hustle_ideas` - Business idea storage
- `user_hustle_attempts` - User hustle tracking

### E-commerce
- `shop_products` - Product catalog
- `v_shop_products` - Product view (may be a view)
- `shop_orders` - Order management
- `affiliate_sales` - Affiliate sales tracking

### Social Features
- `social_groups` - User groups
- `group_memberships` - Group membership tracking
- `social_posts` - Social media posts

### Analytics & Monitoring
- `analytics_summary` - Analytics aggregation
- `analytics_daily` - Daily analytics summaries
- `active_recommendations` - Real-time recommendations

### Caching & Performance
- `audio_cache` - TTS audio caching

## Table Relationships

### Primary Keys
- Most tables use `id` as primary key
- User-related tables reference `user_id` (UUID format)

### Common Fields
- `created_at` - Timestamp of record creation
- `updated_at` - Timestamp of last update
- `user_id` - Foreign key to profiles table

### Important Constraints
- User IDs should be UUID format: `550e8400-e29b-41d4-a716-446655440000`
- Timestamps should be ISO format strings
- JSON fields are used for flexible data storage (context_data, event_data, etc.)

## Critical Tables for Core Functionality

These tables are essential for basic PAM operation:

1. **profiles** - User management
2. **pam_analytics_logs** - Event tracking and analytics
3. **pam_conversation_memory** - Chat history
4. **chat_sessions** - Session management
5. **calendar_events** - Calendar integration
6. **expenses** - Financial tracking
7. **maintenance_records** - Vehicle maintenance

## Views and Virtual Tables

Some tables may be database views:
- `v_shop_products` - Product view with additional computed fields

## Notes

- All JSON fields should support PostgreSQL JSONB for better performance
- Indexes should be created on frequently queried fields (user_id, created_at, etc.)
- Some tables may be optional depending on feature requirements
- The schema supports both authenticated and anonymous users