-- Backup of trip_scraper related tables before implementation
-- Created: 2025-01-31
-- This backup can be used to restore the database if needed

-- Current state of trip_scraper_jobs table
-- Table exists with the following structure:
-- id (uuid), status (text), source_url (text), region (text), 
-- parameters (jsonb), results (jsonb), templates_created (integer),
-- error_message (text), created_by (uuid), created_at (timestamp),
-- started_at (timestamp), completed_at (timestamp)

-- Current RLS Policy:
-- Policy Name: "Admins can manage scraper jobs"
-- Policy: profiles.role = 'admin'

-- To restore if needed:
-- 1. DROP TABLE IF EXISTS trip_scraper_jobs CASCADE;
-- 2. Run the original migration files in order