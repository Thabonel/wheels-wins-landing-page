# Migration Strategy: Enhanced Planning Features

**Version:** 1.0
**Last Updated:** January 2025
**Status:** Production Ready
**Estimated Timeline:** 8 weeks (aligned with INTEGRATION_PLAN.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Migration Principles](#2-migration-principles)
3. [Database Schema Migrations](#3-database-schema-migrations)
4. [Data Structure Enhancements](#4-data-structure-enhancements)
5. [User Permission Updates](#5-user-permission-updates)
6. [Backward Compatibility Strategy](#6-backward-compatibility-strategy)
7. [Migration Scripts](#7-migration-scripts)
8. [Rollback Procedures](#8-rollback-procedures)
9. [Testing Strategy](#9-testing-strategy)
10. [Timeline & Phasing](#10-timeline--phasing)
11. [Risk Mitigation](#11-risk-mitigation)
12. [Success Metrics](#12-success-metrics)

---

## 1. Executive Summary

This migration strategy ensures **zero downtime** and **zero breaking changes** while adding comprehensive planning features to the Wheels & Wins platform.

### Key Principles

- **Additive Only**: All changes add new features without modifying existing functionality
- **Backward Compatible**: Existing API clients continue to work without changes
- **Feature Flagged**: New features can be enabled/disabled per user or globally
- **Rollback Ready**: Every migration has a tested rollback procedure
- **Data Integrity**: All migrations preserve existing user data
- **Performance Safe**: Migrations execute with minimal performance impact

### Migration Overview

| Phase | Duration | New Tables | Enhanced Tables | Breaking Changes |
|-------|----------|------------|-----------------|------------------|
| Phase 1 | Week 1-2 | 2 tables | 1 table | **NONE** |
| Phase 2 | Week 3-4 | 3 tables | 2 tables | **NONE** |
| Phase 3 | Week 5-6 | 2 tables | 1 table | **NONE** |
| Phase 4 | Week 7-8 | 0 tables | 0 tables | **NONE** |

**Total Changes:**
- **7 new tables** added
- **4 existing tables** enhanced (non-destructive)
- **0 breaking changes** to existing APIs
- **100% backward compatible**

---

## 2. Migration Principles

### 2.1 Zero Downtime

**Strategy:**
- Use **online schema migrations** (no table locks)
- Apply changes during low-traffic periods
- Use **feature flags** to enable features incrementally
- Deploy database changes **before** application code

**Implementation:**
```sql
-- ✅ SAFE: Add new column with default value
ALTER TABLE user_trips
ADD COLUMN gpx_data JSONB DEFAULT NULL;

-- ❌ UNSAFE: Never lock tables
-- ALTER TABLE user_trips
-- ADD COLUMN gpx_data JSONB NOT NULL; -- This would lock!

-- ✅ SAFE: Create indexes concurrently
CREATE INDEX CONCURRENTLY idx_route_versions_trip_id
ON route_versions(trip_id);
```

### 2.2 Backward Compatibility

**API Compatibility Rules:**
1. **Never remove fields** from existing API responses
2. **Never change field types** (string → number, etc.)
3. **Never make optional fields required**
4. **Always add new fields as optional**
5. **Version breaking changes** (use `/api/v2/` if needed)

**Database Compatibility Rules:**
1. **Never drop columns** (mark deprecated instead)
2. **Never rename columns** (add new column, migrate data, deprecate old)
3. **Always add columns with DEFAULT values**
4. **Never add NOT NULL constraints without defaults**

### 2.3 Feature Flags

**Flag Strategy:**
```typescript
// src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  // Phase 1
  GPX_IMPORT_EXPORT: process.env.VITE_FEATURE_GPX === 'true',
  ROUTE_VERSIONING: process.env.VITE_FEATURE_VERSIONING === 'true',

  // Phase 2
  COLLABORATIVE_EDITING: process.env.VITE_FEATURE_COLLAB === 'true',
  EQUIPMENT_MANAGEMENT: process.env.VITE_FEATURE_EQUIPMENT === 'true',

  // Phase 3
  OFFLINE_MAPS: process.env.VITE_FEATURE_OFFLINE === 'true',
  COMMUNITY_SHARING: process.env.VITE_FEATURE_COMMUNITY === 'true',

  // Phase 4
  READINESS_CHECKLISTS: process.env.VITE_FEATURE_CHECKLISTS === 'true'
};

// Usage in components
export const GPXImporter: React.FC = () => {
  if (!FEATURE_FLAGS.GPX_IMPORT_EXPORT) {
    return null; // Feature not enabled yet
  }

  return <GPXImporterUI />;
};
```

**Backend Feature Flags:**
```python
# backend/app/core/feature_flags.py
from typing import Optional
from functools import wraps
from fastapi import HTTPException

class FeatureFlags:
    GPX_IMPORT_EXPORT = os.getenv('FEATURE_GPX', 'false') == 'true'
    ROUTE_VERSIONING = os.getenv('FEATURE_VERSIONING', 'false') == 'true'
    COLLABORATIVE_EDITING = os.getenv('FEATURE_COLLAB', 'false') == 'true'
    EQUIPMENT_MANAGEMENT = os.getenv('FEATURE_EQUIPMENT', 'false') == 'true'

def require_feature(feature_name: str):
    """Decorator to guard endpoints with feature flags"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not getattr(FeatureFlags, feature_name, False):
                raise HTTPException(
                    status_code=403,
                    detail=f"Feature {feature_name} is not enabled"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@app.post("/api/v1/trips/import-gpx")
@require_feature('GPX_IMPORT_EXPORT')
async def import_gpx(file: UploadFile):
    pass
```

### 2.4 Data Integrity

**Validation Rules:**
1. **Foreign key constraints** on all relationships
2. **Check constraints** for data validity
3. **Unique constraints** where applicable
4. **Default values** for all nullable columns
5. **Cascading deletes** for child records

**Example:**
```sql
-- Foreign key with cascading delete
ALTER TABLE route_versions
ADD CONSTRAINT fk_route_versions_trip_id
FOREIGN KEY (trip_id)
REFERENCES user_trips(id)
ON DELETE CASCADE;

-- Check constraint for valid data
ALTER TABLE equipment
ADD CONSTRAINT check_weight_positive
CHECK (weight_kg >= 0);

-- Unique constraint
ALTER TABLE equipment
ADD CONSTRAINT unique_user_name
UNIQUE (user_id, name);
```

---

## 3. Database Schema Migrations

### 3.1 New Tables (7 Total)

#### Phase 1: Week 1-2

**Table 1: `route_versions`**

**Purpose:** Store version history for trip routes (undo/redo, comparison)

```sql
CREATE TABLE route_versions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_version_id UUID REFERENCES route_versions(id) ON DELETE SET NULL,

  -- Version metadata
  version_number INTEGER NOT NULL,
  change_description TEXT,
  is_auto_save BOOLEAN DEFAULT false,

  -- Route snapshot data
  route_data JSONB NOT NULL,
  waypoints_snapshot JSONB,

  -- Diff from parent (for efficient storage)
  diff_from_parent JSONB,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT route_versions_version_number_check CHECK (version_number > 0),
  CONSTRAINT route_versions_unique_trip_version
    UNIQUE (trip_id, version_number)
);

-- Indexes
CREATE INDEX idx_route_versions_trip_id ON route_versions(trip_id);
CREATE INDEX idx_route_versions_created_at ON route_versions(created_at DESC);
CREATE INDEX idx_route_versions_parent ON route_versions(parent_version_id);

-- RLS Policies
ALTER TABLE route_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own route versions"
ON route_versions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own route versions"
ON route_versions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE allowed (versions are immutable)
```

**Table 2: `trip_collaborators`**

**Purpose:** Manage shared access to trips (owner, editor, viewer permissions)

```sql
CREATE TABLE trip_collaborators (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Permissions
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),

  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT trip_collaborators_unique_user_trip
    UNIQUE (trip_id, user_id)
);

-- Indexes
CREATE INDEX idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX idx_trip_collaborators_user_id ON trip_collaborators(user_id);
CREATE INDEX idx_trip_collaborators_status ON trip_collaborators(status);

-- RLS Policies
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip owners can manage collaborators"
ON trip_collaborators FOR ALL
USING (
  trip_id IN (
    SELECT id FROM user_trips WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own collaborations"
ON trip_collaborators FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can accept/decline invitations"
ON trip_collaborators FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

#### Phase 2: Week 3-4

**Table 3: `equipment`**

**Purpose:** User's equipment inventory (gear, tools, supplies)

```sql
CREATE TABLE equipment (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES equipment_categories(id),

  -- Equipment details
  name TEXT NOT NULL,
  description TEXT,

  -- Technical specs
  weight_kg DECIMAL(10, 2),
  dimensions_cm JSONB, -- {length: 100, width: 50, height: 30}
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  purchase_location TEXT,
  warranty_expires DATE,

  -- Current status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'in_use', 'maintenance', 'retired', 'lost', 'sold')),
  condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor')),
  current_location TEXT,

  -- Storage
  storage_location TEXT,
  storage_notes TEXT,

  -- Images
  images TEXT[], -- Array of image URLs

  -- Tags for searching
  tags TEXT[],

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT equipment_weight_positive CHECK (weight_kg >= 0),
  CONSTRAINT equipment_price_positive CHECK (purchase_price >= 0)
);

-- Indexes
CREATE INDEX idx_equipment_user_id ON equipment(user_id);
CREATE INDEX idx_equipment_category_id ON equipment(category_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_tags ON equipment USING GIN(tags);
CREATE INDEX idx_equipment_name_trgm ON equipment USING gin(name gin_trgm_ops);

-- Full-text search index
CREATE INDEX idx_equipment_search
ON equipment USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- RLS Policies
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own equipment"
ON equipment FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

**Table 4: `equipment_categories`**

**Purpose:** Categorize equipment (system-defined + user-defined)

```sql
CREATE TABLE equipment_categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_category_id UUID REFERENCES equipment_categories(id),

  -- Category details
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name from icon library
  color TEXT, -- Hex color for UI

  -- System vs user categories
  is_system_category BOOLEAN DEFAULT false,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT equipment_categories_unique_user_name
    UNIQUE (user_id, name),
  CONSTRAINT equipment_categories_system_no_user
    CHECK ((is_system_category = true AND user_id IS NULL) OR is_system_category = false)
);

-- Indexes
CREATE INDEX idx_equipment_categories_user_id ON equipment_categories(user_id);
CREATE INDEX idx_equipment_categories_parent ON equipment_categories(parent_category_id);

-- RLS Policies
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
ON equipment_categories FOR SELECT
USING (is_system_category = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own categories"
ON equipment_categories FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_system_category = false);

CREATE POLICY "Users can update their own categories"
ON equipment_categories FOR UPDATE
USING (user_id = auth.uid() AND is_system_category = false)
WITH CHECK (user_id = auth.uid() AND is_system_category = false);

CREATE POLICY "Users can delete their own categories"
ON equipment_categories FOR DELETE
USING (user_id = auth.uid() AND is_system_category = false);

-- Seed system categories
INSERT INTO equipment_categories (name, description, icon, is_system_category) VALUES
('Camping', 'Tents, sleeping bags, camping gear', 'tent', true),
('Cooking', 'Stoves, utensils, cookware', 'utensils', true),
('Safety', 'First aid, emergency supplies', 'shield', true),
('Tools', 'Repair tools, maintenance equipment', 'wrench', true),
('Electronics', 'Gadgets, chargers, solar panels', 'battery', true),
('Clothing', 'Outdoor apparel, footwear', 'shirt', true),
('Vehicle', 'RV parts, accessories', 'car', true),
('Water', 'Filters, containers, hoses', 'droplet', true),
('Power', 'Generators, batteries, inverters', 'zap', true),
('Navigation', 'GPS, maps, compasses', 'map', true);
```

**Table 5: `equipment_maintenance`**

**Purpose:** Track maintenance history for equipment

```sql
CREATE TABLE equipment_maintenance (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Maintenance details
  maintenance_type TEXT NOT NULL
    CHECK (maintenance_type IN ('inspection', 'repair', 'service', 'cleaning', 'calibration', 'replacement')),
  date DATE NOT NULL,
  description TEXT NOT NULL,

  -- Service provider
  performed_by TEXT, -- "Self" or service provider name
  service_location TEXT,

  -- Costs
  cost DECIMAL(10, 2),

  -- Parts replaced
  parts_replaced TEXT[],

  -- Next service
  next_service_date DATE,
  next_service_notes TEXT,

  -- Attachments
  receipts TEXT[], -- URLs to receipt images
  photos TEXT[], -- Before/after photos

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT equipment_maintenance_cost_positive CHECK (cost >= 0)
);

-- Indexes
CREATE INDEX idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_user_id ON equipment_maintenance(user_id);
CREATE INDEX idx_equipment_maintenance_date ON equipment_maintenance(date DESC);

-- RLS Policies
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage maintenance for their equipment"
ON equipment_maintenance FOR ALL
USING (
  equipment_id IN (
    SELECT id FROM equipment WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  equipment_id IN (
    SELECT id FROM equipment WHERE user_id = auth.uid()
  )
);
```

#### Phase 3: Week 5-6

**Table 6: `readiness_checklists`**

**Purpose:** Pre-departure checklists for trips

```sql
CREATE TABLE readiness_checklists (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  trip_id UUID REFERENCES user_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id),

  -- Checklist metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Items (stored as JSONB for flexibility)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Structure: [
  --   {
  --     "id": "uuid",
  --     "text": "Check tire pressure",
  --     "category": "Vehicle",
  --     "completed": false,
  --     "completed_at": null,
  --     "completed_by_user_id": null,
  --     "notes": ""
  --   }
  -- ]

  -- Progress tracking
  total_items INTEGER GENERATED ALWAYS AS (jsonb_array_length(items)) STORED,
  completed_items INTEGER DEFAULT 0,
  completion_percentage INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN jsonb_array_length(items) > 0
      THEN (completed_items * 100) / jsonb_array_length(items)
      ELSE 0
    END
  ) STORED,

  -- Status
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT readiness_checklists_completed_items_valid
    CHECK (completed_items >= 0 AND completed_items <= jsonb_array_length(items))
);

-- Indexes
CREATE INDEX idx_readiness_checklists_trip_id ON readiness_checklists(trip_id);
CREATE INDEX idx_readiness_checklists_user_id ON readiness_checklists(user_id);
CREATE INDEX idx_readiness_checklists_status ON readiness_checklists(status);

-- RLS Policies
ALTER TABLE readiness_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own checklists"
ON readiness_checklists FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Trip collaborators can view checklists"
ON readiness_checklists FOR SELECT
USING (
  trip_id IN (
    SELECT trip_id FROM trip_collaborators
    WHERE user_id = auth.uid() AND status = 'accepted'
  )
);
```

**Table 7: `offline_map_downloads`**

**Purpose:** Track offline map tile downloads for offline usage

```sql
CREATE TABLE offline_map_downloads (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES user_trips(id) ON DELETE SET NULL,

  -- Geographic bounds
  bounds JSONB NOT NULL, -- {north, south, east, west}
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),

  -- Zoom levels
  min_zoom INTEGER NOT NULL CHECK (min_zoom >= 0 AND min_zoom <= 20),
  max_zoom INTEGER NOT NULL CHECK (max_zoom >= 0 AND max_zoom <= 20),

  -- Map style
  style TEXT NOT NULL DEFAULT 'streets', -- 'streets', 'satellite', 'outdoors', 'terrain'

  -- Download metadata
  total_tiles INTEGER,
  downloaded_tiles INTEGER DEFAULT 0,
  failed_tiles INTEGER DEFAULT 0,

  -- Storage
  estimated_size_mb DECIMAL(10, 2),
  actual_size_mb DECIMAL(10, 2),
  storage_path TEXT, -- Where tiles are stored

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'downloading', 'completed', 'failed', 'cancelled')),

  -- Progress
  download_started_at TIMESTAMPTZ,
  download_completed_at TIMESTAMPTZ,
  download_speed_kbps DECIMAL(10, 2),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Expiration (offline maps expire after 30 days)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT offline_map_downloads_zoom_valid CHECK (min_zoom <= max_zoom),
  CONSTRAINT offline_map_downloads_tiles_valid
    CHECK (downloaded_tiles + failed_tiles <= total_tiles)
);

-- Indexes
CREATE INDEX idx_offline_map_downloads_user_id ON offline_map_downloads(user_id);
CREATE INDEX idx_offline_map_downloads_trip_id ON offline_map_downloads(trip_id);
CREATE INDEX idx_offline_map_downloads_status ON offline_map_downloads(status);
CREATE INDEX idx_offline_map_downloads_expires_at ON offline_map_downloads(expires_at);

-- RLS Policies
ALTER TABLE offline_map_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own offline maps"
ON offline_map_downloads FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 3.2 Summary of New Tables

| Table Name | Phase | Records Expected | Storage Impact |
|------------|-------|------------------|----------------|
| `route_versions` | 1 | ~50 per trip | ~10KB per version |
| `trip_collaborators` | 1 | ~3 per shared trip | ~500B per record |
| `equipment` | 2 | ~100 per user | ~2KB per item |
| `equipment_categories` | 2 | ~20 per user + 10 system | ~500B per category |
| `equipment_maintenance` | 2 | ~10 per equipment/year | ~1KB per record |
| `readiness_checklists` | 3 | ~5 per trip | ~3KB per checklist |
| `offline_map_downloads` | 3 | ~10 per user | ~50MB per download |

**Estimated Storage Impact:**
- **Year 1**: ~2GB for 10,000 active users
- **Year 3**: ~6GB for 30,000 active users
- **Offline maps**: ~500GB for 10,000 users (stored separately, not in database)

---

## 4. Data Structure Enhancements

### 4.1 Enhance `user_trips` Table

**Existing Schema:**
```sql
CREATE TABLE user_trips (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  origin TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  distance_miles DECIMAL(10,2),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  status TEXT,
  notes TEXT,
  route_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration: Add GPX and Versioning Support**

```sql
-- Migration: 001_enhance_user_trips_gpx_versioning.sql

-- Add new columns (all nullable for backward compatibility)
ALTER TABLE user_trips
ADD COLUMN gpx_data JSONB DEFAULT NULL,
ADD COLUMN gpx_metadata JSONB DEFAULT NULL,
ADD COLUMN current_version_id UUID DEFAULT NULL,
ADD COLUMN version_count INTEGER DEFAULT 0,
ADD COLUMN is_shared_publicly BOOLEAN DEFAULT false,
ADD COLUMN public_share_id TEXT DEFAULT NULL,
ADD COLUMN share_settings JSONB DEFAULT '{}'::jsonb;

-- Add foreign key constraint (deferred to avoid circular dependency)
-- Will be added after route_versions table is created
-- ALTER TABLE user_trips
-- ADD CONSTRAINT fk_user_trips_current_version
-- FOREIGN KEY (current_version_id) REFERENCES route_versions(id);

-- Add index for public sharing
CREATE INDEX idx_user_trips_public_share_id
ON user_trips(public_share_id)
WHERE is_shared_publicly = true;

-- Add check constraint
ALTER TABLE user_trips
ADD CONSTRAINT user_trips_public_share_valid
CHECK (
  (is_shared_publicly = false AND public_share_id IS NULL) OR
  (is_shared_publicly = true AND public_share_id IS NOT NULL)
);

-- Update RLS policy to allow public access to shared trips
CREATE POLICY "Public can view shared trips"
ON user_trips FOR SELECT
USING (is_shared_publicly = true);

-- Backfill: Generate public_share_id for existing shared trips (if any)
UPDATE user_trips
SET public_share_id = encode(gen_random_bytes(16), 'hex')
WHERE is_shared_publicly = true AND public_share_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_trips.gpx_data IS
  'Full GPX file data stored as JSONB for import/export functionality';
COMMENT ON COLUMN user_trips.gpx_metadata IS
  'Metadata extracted from GPX (elevation profile, timestamps, etc.)';
COMMENT ON COLUMN user_trips.current_version_id IS
  'Current active version of the route (NULL = no versioning enabled)';
COMMENT ON COLUMN user_trips.public_share_id IS
  'Unique shareable URL identifier for public trips';
```

**Migration Testing:**
```sql
-- Test: Verify existing trips are unaffected
SELECT COUNT(*) FROM user_trips WHERE gpx_data IS NULL; -- Should be ALL existing trips

-- Test: Verify new columns have correct defaults
INSERT INTO user_trips (user_id, origin, destination)
VALUES (auth.uid(), 'Test Origin', 'Test Destination');

SELECT
  gpx_data IS NULL AS gpx_null,
  gpx_metadata IS NULL AS metadata_null,
  version_count = 0 AS version_zero,
  is_shared_publicly = false AS not_shared
FROM user_trips
WHERE id = (SELECT id FROM user_trips ORDER BY created_at DESC LIMIT 1);
-- Expected: all TRUE

-- Cleanup test data
DELETE FROM user_trips WHERE origin = 'Test Origin';
```

### 4.2 Enhance `equipment` Table (from `maintenance_records`)

**Current State:**
The platform currently has a `maintenance_records` table for tracking vehicle maintenance. We're adding a separate `equipment` table (see Section 3.1) rather than merging, because:
- Equipment is broader than just maintenance items
- Equipment inventory serves different use case (packing, weight tracking)
- Separate tables allow independent evolution

**No migration needed** - new `equipment` table is standalone.

### 4.3 Enhance `profiles` Table for Preferences

**Migration: Add Equipment and Checklist Preferences**

```sql
-- Migration: 002_enhance_profiles_preferences.sql

-- Add new JSONB column for enhanced preferences
ALTER TABLE profiles
ADD COLUMN enhanced_preferences JSONB DEFAULT '{}'::jsonb;

-- Seed default preferences for existing users
UPDATE profiles
SET enhanced_preferences = jsonb_build_object(
  'equipment', jsonb_build_object(
    'auto_suggest_packing', true,
    'weight_unit', 'kg',
    'show_maintenance_reminders', true
  ),
  'checklists', jsonb_build_object(
    'auto_create_from_template', true,
    'default_template_id', NULL,
    'reminder_days_before_trip', 7
  ),
  'offline_maps', jsonb_build_object(
    'auto_download', false,
    'max_storage_gb', 5,
    'preferred_style', 'streets'
  ),
  'collaboration', jsonb_build_object(
    'allow_invitations', true,
    'default_role_for_invites', 'viewer',
    'email_on_trip_update', true
  )
)
WHERE enhanced_preferences = '{}'::jsonb;

-- Add GIN index for JSONB querying
CREATE INDEX idx_profiles_enhanced_preferences
ON profiles USING GIN(enhanced_preferences);

-- Add comment
COMMENT ON COLUMN profiles.enhanced_preferences IS
  'User preferences for new planning features (equipment, checklists, maps, collaboration)';
```

### 4.4 Enhance `user_settings` Table (if exists)

**Check if table exists:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'user_settings'
);
```

**If exists, enhance it:**
```sql
-- Migration: 003_enhance_user_settings_feature_flags.sql

ALTER TABLE user_settings
ADD COLUMN feature_flags JSONB DEFAULT '{}'::jsonb;

-- Seed feature flags for existing users (all disabled by default)
UPDATE user_settings
SET feature_flags = jsonb_build_object(
  'gpx_import_export', false,
  'route_versioning', false,
  'collaborative_editing', false,
  'equipment_management', false,
  'offline_maps', false,
  'community_sharing', false,
  'readiness_checklists', false
)
WHERE feature_flags = '{}'::jsonb;
```

**If doesn't exist, create it:**
```sql
-- Migration: 003_create_user_settings.sql

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Feature flags (per-user overrides)
  feature_flags JSONB DEFAULT '{}'::jsonb,

  -- Notification preferences
  notification_preferences JSONB DEFAULT '{}'::jsonb,

  -- UI preferences
  ui_preferences JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT user_settings_unique_user UNIQUE (user_id)
);

-- RLS Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
ON user_settings FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Seed settings for existing users
INSERT INTO user_settings (user_id, feature_flags)
SELECT
  id,
  '{}'::jsonb
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## 5. User Permission Updates

### 5.1 New Permission System

**Permission Levels:**
1. **Owner**: Full control (read, write, delete, share, manage collaborators)
2. **Editor**: Can modify trip (read, write), cannot delete or manage collaborators
3. **Viewer**: Read-only access

**Implementation:**

```sql
-- Function to check trip permission
CREATE OR REPLACE FUNCTION has_trip_permission(
  p_trip_id UUID,
  p_user_id UUID,
  p_required_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if user is the trip owner
  SELECT 'owner' INTO v_user_role
  FROM user_trips
  WHERE id = p_trip_id AND user_id = p_user_id;

  IF v_user_role = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a collaborator
  SELECT role INTO v_user_role
  FROM trip_collaborators
  WHERE trip_id = p_trip_id
    AND user_id = p_user_id
    AND status = 'accepted';

  -- Permission hierarchy: owner > editor > viewer
  CASE p_required_role
    WHEN 'viewer' THEN
      RETURN v_user_role IN ('owner', 'editor', 'viewer');
    WHEN 'editor' THEN
      RETURN v_user_role IN ('owner', 'editor');
    WHEN 'owner' THEN
      RETURN v_user_role = 'owner';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_trip_permission TO authenticated;
```

### 5.2 Update RLS Policies for Collaborative Access

**Update `user_trips` RLS:**

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Users can manage their own trips" ON user_trips;

-- New policies for collaborative access
CREATE POLICY "Trip owners and collaborators can view trips"
ON user_trips FOR SELECT
USING (
  user_id = auth.uid() OR -- Owner
  id IN ( -- Collaborator
    SELECT trip_id FROM trip_collaborators
    WHERE user_id = auth.uid() AND status = 'accepted'
  ) OR
  is_shared_publicly = true -- Public
);

CREATE POLICY "Trip owners can create trips"
ON user_trips FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Trip owners and editors can update trips"
ON user_trips FOR UPDATE
USING (has_trip_permission(id, auth.uid(), 'editor'))
WITH CHECK (has_trip_permission(id, auth.uid(), 'editor'));

CREATE POLICY "Only trip owners can delete trips"
ON user_trips FOR DELETE
USING (user_id = auth.uid());
```

**Update `route_versions` RLS:**

```sql
-- Version viewing: owners + collaborators
CREATE POLICY "Trip collaborators can view route versions"
ON route_versions FOR SELECT
USING (
  trip_id IN (
    SELECT id FROM user_trips
    WHERE user_id = auth.uid() OR id IN (
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  )
);

-- Version creation: owners + editors only
CREATE POLICY "Trip editors can create route versions"
ON route_versions FOR INSERT
WITH CHECK (
  has_trip_permission(trip_id, auth.uid(), 'editor')
);
```

### 5.3 Admin Override Permissions

**Create admin role check:**

```sql
-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- Add admin override to trip policies
CREATE POLICY "Admins can view all trips"
ON user_trips FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update any trip"
ON user_trips FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

---

## 6. Backward Compatibility Strategy

### 6.1 API Compatibility Matrix

| Endpoint | Change Type | Compatibility | Notes |
|----------|-------------|---------------|-------|
| `GET /api/v1/trips/{id}` | **Extended** | ✅ 100% | New optional fields added |
| `POST /api/v1/trips` | **Extended** | ✅ 100% | New optional fields in request |
| `PATCH /api/v1/trips/{id}` | **Extended** | ✅ 100% | New optional fields in request |
| All new endpoints | **Added** | ✅ N/A | No impact on existing APIs |

**Example: Extended Response**

**Before:**
```json
{
  "id": "trip-uuid",
  "origin": "Phoenix",
  "destination": "Seattle",
  "distance_miles": 1420
}
```

**After (with new fields):**
```json
{
  "id": "trip-uuid",
  "origin": "Phoenix",
  "destination": "Seattle",
  "distance_miles": 1420,

  // NEW FIELDS (all optional)
  "gpx_data": {...},
  "current_version_id": "version-uuid",
  "version_count": 5,
  "is_shared_publicly": false,
  "collaborators": []
}
```

**Client Handling:**
```typescript
// Old client - ignores new fields
const { id, origin, destination } = tripResponse;

// New client - uses new fields
const { id, gpx_data, collaborators, ...rest } = tripResponse;
```

### 6.2 Database Query Compatibility

**Existing queries continue to work:**

```sql
-- Old query (still works)
SELECT id, origin, destination, distance_miles
FROM user_trips
WHERE user_id = :user_id;

-- New query (uses new fields)
SELECT
  id,
  origin,
  destination,
  distance_miles,
  gpx_data, -- New field
  current_version_id, -- New field
  version_count -- New field
FROM user_trips
WHERE user_id = :user_id;
```

**All new columns have DEFAULT values:**
- Queries without explicit column lists still work
- INSERT statements without new columns still work

### 6.3 Frontend Component Compatibility

**Strategy: Feature flags + gradual rollout**

```typescript
// Old component (no changes needed)
export const TripList: React.FC = () => {
  const { data: trips } = useQuery(['trips'], fetchTrips);

  return (
    <div>
      {trips.map(trip => (
        <TripCard
          key={trip.id}
          origin={trip.origin}
          destination={trip.destination}
        />
      ))}
    </div>
  );
};

// Enhanced component (uses new features if enabled)
export const EnhancedTripList: React.FC = () => {
  const { data: trips } = useQuery(['trips'], fetchTrips);

  return (
    <div>
      {trips.map(trip => (
        <EnhancedTripCard
          key={trip.id}
          trip={trip}
          showVersioning={FEATURE_FLAGS.ROUTE_VERSIONING}
          showCollaborators={FEATURE_FLAGS.COLLABORATIVE_EDITING}
        />
      ))}
    </div>
  );
};
```

### 6.4 Mobile App Compatibility

**Versioning Strategy:**

```typescript
// Mobile app version detection
const APP_VERSION = '2.1.0';
const MIN_API_VERSION = '1.0';
const CURRENT_API_VERSION = '1.1'; // API version with new features

// Check if server supports new features
async function checkServerCapabilities() {
  const response = await fetch('/api/v1/health');
  const { api_version, features } = await response.json();

  return {
    supportsGPX: features.includes('gpx_import_export'),
    supportsVersioning: features.includes('route_versioning'),
    supportsCollaboration: features.includes('collaborative_editing')
  };
}

// Conditionally render features
export const TripScreen: React.FC = () => {
  const { supportsGPX } = useServerCapabilities();

  return (
    <View>
      <TripDetails />
      {supportsGPX && <GPXImportButton />}
    </View>
  );
};
```

**Health endpoint enhancement:**
```python
# backend/app/api/v1/health.py

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "api_version": "1.1",
        "features": [
            "gpx_import_export" if FeatureFlags.GPX_IMPORT_EXPORT else None,
            "route_versioning" if FeatureFlags.ROUTE_VERSIONING else None,
            "collaborative_editing" if FeatureFlags.COLLABORATIVE_EDITING else None,
            "equipment_management" if FeatureFlags.EQUIPMENT_MANAGEMENT else None,
            "offline_maps" if FeatureFlags.OFFLINE_MAPS else None,
            "community_sharing" if FeatureFlags.COMMUNITY_SHARING else None,
            "readiness_checklists" if FeatureFlags.READINESS_CHECKLISTS else None
        ]
    }
```

---

## 7. Migration Scripts

### 7.1 Migration Naming Convention

**Format:** `{phase}_{sequence}_{description}.sql`

**Examples:**
- `phase1_001_create_route_versions.sql`
- `phase1_002_create_trip_collaborators.sql`
- `phase2_001_create_equipment_tables.sql`

### 7.2 Migration Template

```sql
-- Migration: {phase}_{sequence}_{description}.sql
-- Description: {What this migration does}
-- Phase: {1, 2, 3, or 4}
-- Dependencies: {List of previous migrations}
-- Estimated Time: {How long this will take on production}
-- Rollback: {phase}_{sequence}_{description}_rollback.sql

-- ==================================================
-- PRE-FLIGHT CHECKS
-- ==================================================

DO $$
BEGIN
  -- Check PostgreSQL version
  IF current_setting('server_version_num')::int < 140000 THEN
    RAISE EXCEPTION 'PostgreSQL 14+ required';
  END IF;

  -- Check required extensions
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'Extension uuid-ossp required';
  END IF;
END $$;

-- ==================================================
-- MIGRATION START
-- ==================================================

BEGIN;

-- {Migration SQL here}

-- Example:
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- ==================================================
-- POST-MIGRATION VALIDATION
-- ==================================================

DO $$
BEGIN
  -- Verify table was created
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'new_table'
  ) THEN
    RAISE EXCEPTION 'Migration failed: new_table was not created';
  END IF;

  -- Verify indexes
  IF NOT EXISTS (
    SELECT FROM pg_indexes
    WHERE tablename = 'new_table' AND indexname = 'idx_new_table_user_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: index was not created';
  END IF;
END $$;

COMMIT;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Record migration in tracking table
INSERT INTO schema_migrations (version, name, executed_at)
VALUES ('{phase}_{sequence}', '{description}', NOW());
```

### 7.3 Complete Migration Scripts

**Phase 1, Migration 1: Route Versions Table**

```sql
-- Migration: phase1_001_create_route_versions.sql
-- Description: Create route_versions table for version control
-- Phase: 1
-- Dependencies: None
-- Estimated Time: 5 seconds
-- Rollback: phase1_001_create_route_versions_rollback.sql

BEGIN;

-- Create table (see Section 3.1 for full schema)
CREATE TABLE route_versions (...);

-- Create indexes
CREATE INDEX idx_route_versions_trip_id ON route_versions(trip_id);
CREATE INDEX idx_route_versions_created_at ON route_versions(created_at DESC);
CREATE INDEX idx_route_versions_parent ON route_versions(parent_version_id);

-- Enable RLS
ALTER TABLE route_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own route versions"
ON route_versions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own route versions"
ON route_versions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'route_versions'
  ) THEN
    RAISE EXCEPTION 'Migration failed: route_versions table was not created';
  END IF;
END $$;

COMMIT;
```

**Rollback Script:**

```sql
-- Rollback: phase1_001_create_route_versions_rollback.sql

BEGIN;

-- Drop policies
DROP POLICY IF EXISTS "Users can create their own route versions" ON route_versions;
DROP POLICY IF EXISTS "Users can view their own route versions" ON route_versions;

-- Drop indexes
DROP INDEX IF EXISTS idx_route_versions_parent;
DROP INDEX IF EXISTS idx_route_versions_created_at;
DROP INDEX IF EXISTS idx_route_versions_trip_id;

-- Drop table
DROP TABLE IF EXISTS route_versions;

-- Validation
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'route_versions'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: route_versions table still exists';
  END IF;
END $$;

COMMIT;
```

### 7.4 Migration Execution Order

**Phase 1 (Week 1-2):**
```bash
# Execute in order
psql -f migrations/phase1_001_create_route_versions.sql
psql -f migrations/phase1_002_create_trip_collaborators.sql
psql -f migrations/phase1_003_enhance_user_trips_gpx_versioning.sql
psql -f migrations/phase1_004_enhance_profiles_preferences.sql
```

**Phase 2 (Week 3-4):**
```bash
psql -f migrations/phase2_001_create_equipment_categories.sql # Must run first (foreign key dependency)
psql -f migrations/phase2_002_create_equipment.sql
psql -f migrations/phase2_003_create_equipment_maintenance.sql
psql -f migrations/phase2_004_update_user_trips_rls_collaborative.sql
```

**Phase 3 (Week 5-6):**
```bash
psql -f migrations/phase3_001_create_readiness_checklists.sql
psql -f migrations/phase3_002_create_offline_map_downloads.sql
```

**Phase 4 (Week 7-8):**
```bash
# No new migrations, only feature flag enablement
```

---

## 8. Rollback Procedures

### 8.1 Rollback Strategy

**Principles:**
1. **Immediate Rollback**: < 5 minutes to execute
2. **Data Preservation**: Never destroy user data during rollback
3. **Service Continuity**: Application remains functional during rollback
4. **Idempotent**: Can run rollback multiple times safely

### 8.2 Rollback Decision Matrix

| Issue Severity | Response Time | Rollback Strategy |
|----------------|---------------|-------------------|
| **Critical** (service down) | Immediate | Full rollback to last known good state |
| **High** (data corruption) | < 15 min | Rollback affected migration only |
| **Medium** (performance degradation) | < 1 hour | Disable feature flags, investigate |
| **Low** (minor bugs) | Next deploy | Fix forward, no rollback |

### 8.3 Full Rollback Procedure

**Step 1: Disable Feature Flags**
```bash
# Staging environment
export FEATURE_GPX=false
export FEATURE_VERSIONING=false
export FEATURE_COLLAB=false
export FEATURE_EQUIPMENT=false

# Restart services
systemctl restart pam-backend
```

**Step 2: Execute Database Rollback**
```bash
# Rollback Phase 3 migrations
psql -f migrations/phase3_002_create_offline_map_downloads_rollback.sql
psql -f migrations/phase3_001_create_readiness_checklists_rollback.sql

# Rollback Phase 2 migrations
psql -f migrations/phase2_004_update_user_trips_rls_collaborative_rollback.sql
psql -f migrations/phase2_003_create_equipment_maintenance_rollback.sql
psql -f migrations/phase2_002_create_equipment_rollback.sql
psql -f migrations/phase2_001_create_equipment_categories_rollback.sql

# Rollback Phase 1 migrations
psql -f migrations/phase1_004_enhance_profiles_preferences_rollback.sql
psql -f migrations/phase1_003_enhance_user_trips_gpx_versioning_rollback.sql
psql -f migrations/phase1_002_create_trip_collaborators_rollback.sql
psql -f migrations/phase1_001_create_route_versions_rollback.sql
```

**Step 3: Validate Rollback**
```sql
-- Verify all new tables are dropped
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'route_versions',
  'trip_collaborators',
  'equipment',
  'equipment_categories',
  'equipment_maintenance',
  'readiness_checklists',
  'offline_map_downloads'
);
-- Expected: 0 rows

-- Verify user_trips is intact
SELECT COUNT(*) FROM user_trips;
-- Expected: Same count as before migration

-- Verify existing trips still work
SELECT id, origin, destination FROM user_trips LIMIT 5;
-- Expected: Data intact
```

**Step 4: Rollback Application Code**
```bash
# Git revert to previous commit
git revert HEAD~1

# Deploy previous version
./deploy.sh --environment staging --version v2.0.0
```

### 8.4 Partial Rollback (Single Feature)

**Example: Rollback Equipment Management Only**

```bash
# Step 1: Disable feature flag
export FEATURE_EQUIPMENT=false

# Step 2: Rollback database (reverse order)
psql -f migrations/phase2_003_create_equipment_maintenance_rollback.sql
psql -f migrations/phase2_002_create_equipment_rollback.sql
psql -f migrations/phase2_001_create_equipment_categories_rollback.sql

# Step 3: Remove equipment routes from backend
git revert <commit-hash-for-equipment-routes>

# Step 4: Rebuild frontend without equipment components
npm run build

# Step 5: Validate
curl https://staging-api/api/v1/equipment
# Expected: 404 Not Found (good - endpoint removed)
```

### 8.5 Data Recovery After Rollback

**Scenario:** Rollback was executed, but user created data during migration window

**Solution: Data Export Before Rollback**

```sql
-- BEFORE rollback, export new table data to JSON
COPY (
  SELECT row_to_json(t)
  FROM equipment t
) TO '/tmp/equipment_export.json';

COPY (
  SELECT row_to_json(t)
  FROM route_versions t
) TO '/tmp/route_versions_export.json';

-- Execute rollback...

-- AFTER deciding to re-deploy, import data back
COPY equipment FROM '/tmp/equipment_export.json';
COPY route_versions FROM '/tmp/route_versions_export.json';
```

**Automated Backup Script:**
```bash
#!/bin/bash
# scripts/backup_before_rollback.sh

BACKUP_DIR="/tmp/migration_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup all new tables
psql -c "COPY route_versions TO '$BACKUP_DIR/route_versions.csv' CSV HEADER;"
psql -c "COPY trip_collaborators TO '$BACKUP_DIR/trip_collaborators.csv' CSV HEADER;"
psql -c "COPY equipment TO '$BACKUP_DIR/equipment.csv' CSV HEADER;"
# ... (repeat for all new tables)

echo "Backup saved to $BACKUP_DIR"
echo "To restore: psql -c \"COPY table_name FROM '$BACKUP_DIR/table_name.csv' CSV HEADER;\""
```

---

## 9. Testing Strategy

### 9.1 Pre-Migration Testing (Staging)

**Test Suite 1: Schema Validation**
```sql
-- tests/migrations/test_schema_validation.sql

-- Test: Verify all new tables exist
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(t) INTO missing_tables
  FROM (VALUES
    ('route_versions'),
    ('trip_collaborators'),
    ('equipment'),
    ('equipment_categories'),
    ('equipment_maintenance'),
    ('readiness_checklists'),
    ('offline_map_downloads')
  ) AS expected(t)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = expected.t
  );

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', missing_tables;
  END IF;
END $$;

-- Test: Verify all indexes exist
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN (
  'route_versions',
  'trip_collaborators',
  'equipment'
)
ORDER BY tablename, indexname;
-- Manually verify expected indexes are present
```

**Test Suite 2: Data Integrity**
```sql
-- Test: Foreign key constraints work
BEGIN;

-- Try to insert route_version with invalid trip_id
INSERT INTO route_versions (trip_id, user_id, version_number, route_data)
VALUES ('00000000-0000-0000-0000-000000000000', auth.uid(), 1, '{}'::jsonb);
-- Expected: ERROR: violates foreign key constraint

ROLLBACK;

-- Test: Check constraints work
BEGIN;

-- Try to insert equipment with negative weight
INSERT INTO equipment (user_id, name, weight_kg)
VALUES (auth.uid(), 'Test Item', -10);
-- Expected: ERROR: violates check constraint "equipment_weight_positive"

ROLLBACK;

-- Test: Unique constraints work
BEGIN;

-- Insert first trip collaborator
INSERT INTO trip_collaborators (trip_id, user_id, invited_by_user_id, role)
SELECT id, '00000000-0000-0000-0000-000000000001', auth.uid(), 'editor'
FROM user_trips LIMIT 1;

-- Try to insert duplicate
INSERT INTO trip_collaborators (trip_id, user_id, invited_by_user_id, role)
SELECT id, '00000000-0000-0000-0000-000000000001', auth.uid(), 'viewer'
FROM user_trips LIMIT 1;
-- Expected: ERROR: violates unique constraint "trip_collaborators_unique_user_trip"

ROLLBACK;
```

**Test Suite 3: RLS Policies**
```sql
-- Test: Users can only see their own data
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user-1-uuid>';

SELECT COUNT(*) FROM equipment; -- Should see only user 1's equipment

SET request.jwt.claim.sub = '<user-2-uuid>';

SELECT COUNT(*) FROM equipment; -- Should see only user 2's equipment (different count)

-- Test: Collaborative access works
SET request.jwt.claim.sub = '<owner-uuid>';

-- Create trip
INSERT INTO user_trips (user_id, origin, destination)
VALUES (auth.uid(), 'Test', 'Test')
RETURNING id INTO test_trip_id;

-- Invite collaborator
INSERT INTO trip_collaborators (trip_id, user_id, invited_by_user_id, role, status)
VALUES (test_trip_id, '<editor-uuid>', auth.uid(), 'editor', 'accepted');

-- Switch to editor
SET request.jwt.claim.sub = '<editor-uuid>';

-- Editor should see the trip
SELECT * FROM user_trips WHERE id = test_trip_id;
-- Expected: 1 row

-- Editor should be able to update
UPDATE user_trips SET notes = 'Updated by editor' WHERE id = test_trip_id;
-- Expected: 1 row updated

-- Cleanup
RESET ROLE;
```

### 9.2 Post-Migration Testing (Production)

**Smoke Tests (Run immediately after deployment):**

```bash
#!/bin/bash
# scripts/post_migration_smoke_tests.sh

API_BASE="https://pam-backend.onrender.com/api/v1"
TOKEN="<admin-jwt-token>"

echo "🧪 Running post-migration smoke tests..."

# Test 1: Health check
echo "Test 1: Health check"
curl -s "$API_BASE/health" | jq '.status'
# Expected: "healthy"

# Test 2: Existing trips endpoint (backward compatibility)
echo "Test 2: GET /trips (existing endpoint)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/trips" | jq '.[0].id'
# Expected: UUID

# Test 3: New GPX import endpoint (if flag enabled)
echo "Test 3: POST /trips/import-gpx (new endpoint)"
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.gpx" "$API_BASE/trips/import-gpx" | jq '.trip_id'
# Expected: UUID or 403 (if feature disabled)

# Test 4: Equipment endpoint (if flag enabled)
echo "Test 4: GET /equipment (new endpoint)"
curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/equipment" | jq 'length'
# Expected: Number or 403

# Test 5: Database query performance
echo "Test 5: Database query latency"
time psql -c "SELECT COUNT(*) FROM user_trips;"
# Expected: < 100ms

echo "✅ Smoke tests complete"
```

**Performance Tests:**

```python
# tests/performance/test_migration_performance.py
import pytest
import time
from app.services.database import get_db

@pytest.mark.performance
def test_trip_query_performance_after_migration():
    """Verify trip queries are still fast after adding new columns"""
    db = get_db()

    start = time.time()
    result = db.query(
        "SELECT id, origin, destination FROM user_trips LIMIT 100"
    ).fetchall()
    elapsed = time.time() - start

    assert len(result) == 100
    assert elapsed < 0.1, f"Query took {elapsed}s, expected < 100ms"

@pytest.mark.performance
def test_route_versions_query_performance():
    """Verify route version queries are indexed properly"""
    db = get_db()

    # Create test trip with 50 versions
    trip_id = create_test_trip()
    for i in range(50):
        create_test_route_version(trip_id, version_number=i+1)

    start = time.time()
    versions = db.query(
        "SELECT * FROM route_versions WHERE trip_id = %s ORDER BY version_number DESC",
        (trip_id,)
    ).fetchall()
    elapsed = time.time() - start

    assert len(versions) == 50
    assert elapsed < 0.05, f"Query took {elapsed}s, expected < 50ms"
```

**Load Tests:**

```python
# tests/load/test_migration_load.py
from locust import HttpUser, task, between

class TripUser(HttpUser):
    wait_time = between(1, 3)

    @task(10)
    def get_trips(self):
        """Existing endpoint - should handle same load as before"""
        self.client.get("/api/v1/trips", headers=self.headers)

    @task(5)
    def create_trip(self):
        """Existing endpoint"""
        self.client.post("/api/v1/trips", json={
            "origin": "Test",
            "destination": "Test"
        }, headers=self.headers)

    @task(2)
    def import_gpx(self):
        """New endpoint - lower frequency"""
        with open("test.gpx", "rb") as f:
            self.client.post("/api/v1/trips/import-gpx",
                files={"file": f}, headers=self.headers)

# Run: locust -f tests/load/test_migration_load.py --users 100 --spawn-rate 10
```

### 9.3 Rollback Testing

**Rollback Rehearsal (Staging):**

```bash
#!/bin/bash
# scripts/test_rollback_procedure.sh

echo "🎭 Rollback Rehearsal - Staging"

# Step 1: Create test data
echo "Step 1: Creating test data..."
psql -c "INSERT INTO equipment (user_id, name) VALUES (auth.uid(), 'Test Item');"

# Step 2: Execute rollback
echo "Step 2: Executing rollback..."
psql -f migrations/phase2_002_create_equipment_rollback.sql

# Step 3: Verify rollback succeeded
echo "Step 3: Verifying rollback..."
psql -c "SELECT * FROM equipment;" 2>&1 | grep "does not exist"
if [ $? -eq 0 ]; then
  echo "✅ Rollback successful - table dropped"
else
  echo "❌ Rollback failed - table still exists"
  exit 1
fi

# Step 4: Verify existing data intact
echo "Step 4: Verifying existing data..."
psql -c "SELECT COUNT(*) FROM user_trips;"
if [ $? -eq 0 ]; then
  echo "✅ Existing data intact"
else
  echo "❌ Existing data corrupted"
  exit 1
fi

echo "✅ Rollback rehearsal complete"
```

---

## 10. Timeline & Phasing

### 10.1 8-Week Rollout Schedule

**Aligned with INTEGRATION_PLAN.md**

| Week | Phase | Focus | Migrations | Feature Flags | Testing |
|------|-------|-------|------------|---------------|---------|
| 1-2 | **Phase 1** | GPX + Versioning | 4 migrations | GPX, Versioning | Unit + Integration |
| 3-4 | **Phase 2** | Equipment | 3 migrations | Equipment | Unit + Integration |
| 5-6 | **Phase 3** | Checklists + Maps | 2 migrations | Checklists, Maps | Unit + Integration + E2E |
| 7-8 | **Phase 4** | Polish + Launch | 0 migrations | All enabled | Load + UAT |

### 10.2 Detailed Week-by-Week Plan

**Week 1: Phase 1 Preparation**

**Monday-Tuesday:**
- ✅ Create all Phase 1 migration scripts
- ✅ Create rollback scripts
- ✅ Peer review migration code
- ✅ Run migrations on local dev environment

**Wednesday:**
- ✅ Deploy migrations to staging database (morning)
- ✅ Run automated test suite (afternoon)
- ✅ Manual QA testing (afternoon)
- ✅ Address any issues found

**Thursday:**
- ✅ Deploy migrations to production database (2 AM UTC - low traffic)
- ✅ Monitor database performance (all day)
- ✅ Run smoke tests every hour
- ✅ Keep feature flags DISABLED (dark launch)

**Friday:**
- ✅ Enable GPX_IMPORT_EXPORT flag for internal team (10 users)
- ✅ Enable ROUTE_VERSIONING flag for internal team
- ✅ Collect feedback
- ✅ Monitor error logs

**Week 2: Phase 1 Rollout**

**Monday:**
- ✅ Enable flags for 10% of users (A/B test)
- ✅ Monitor metrics: usage, errors, performance

**Tuesday-Wednesday:**
- ✅ Increase to 50% of users if metrics look good
- ✅ Continue monitoring

**Thursday:**
- ✅ Enable for 100% of users
- ✅ Announce features in product update email

**Friday:**
- ✅ Retrospective: What went well? What needs improvement?
- ✅ Document lessons learned

**Weeks 3-8:** Repeat similar pattern for Phases 2, 3, 4

### 10.3 Migration Timing Recommendations

**Best Times to Run Migrations:**

| Environment | Best Time (UTC) | Reason |
|-------------|-----------------|--------|
| **Dev** | Anytime | No users |
| **Staging** | 9 AM - 5 PM | During work hours for quick issue resolution |
| **Production** | 2 AM - 4 AM | Lowest traffic period |

**Production Migration Checklist:**

**24 Hours Before:**
- [ ] Announce maintenance window to users (email + in-app banner)
- [ ] Prepare rollback scripts
- [ ] Backup database
- [ ] Test migrations on staging clone of production
- [ ] Prepare monitoring dashboards

**1 Hour Before:**
- [ ] Put app in "maintenance mode" (optional - only if needed)
- [ ] Stop background jobs (Celery workers)
- [ ] Final database backup

**During Migration:**
- [ ] Execute migrations
- [ ] Run validation queries
- [ ] Monitor logs for errors
- [ ] Run smoke tests

**Immediately After:**
- [ ] Remove maintenance mode
- [ ] Restart background jobs
- [ ] Monitor error rates for 30 minutes
- [ ] Send "all clear" email to team

**1 Hour After:**
- [ ] Review metrics dashboard
- [ ] Check user feedback channels (support, social media)

**24 Hours After:**
- [ ] Full retrospective
- [ ] Update runbook if needed

---

## 11. Risk Mitigation

### 11.1 Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation Strategy | Contingency Plan |
|------|-------------|--------|---------------------|------------------|
| **Migration fails mid-execution** | Low | High | Wrap all migrations in transactions | Automatic rollback via PostgreSQL |
| **Performance degradation** | Medium | Medium | Index optimization, query testing | Disable feature flags, investigate |
| **Data corruption** | Very Low | Critical | Backups before migration, validation checks | Restore from backup, rollback migration |
| **RLS policy blocks legitimate users** | Low | High | Comprehensive RLS testing in staging | Temporarily disable RLS, fix policy, re-enable |
| **Foreign key cascade deletes too much** | Low | High | Use ON DELETE SET NULL instead of CASCADE where appropriate | Restore from backup |
| **Rollback fails** | Very Low | Critical | Test rollback scripts in staging | Manual data cleanup, restore from backup |
| **Feature flag misconfiguration** | Medium | Low | Default all flags to FALSE | Update config, restart services |
| **User confusion with new features** | High | Low | In-app tutorials, feature announcements | Improve documentation, add help tooltips |

### 11.2 Mitigation Strategies

**Strategy 1: Comprehensive Backups**

```bash
#!/bin/bash
# scripts/backup_before_migration.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/pre_migration_$TIMESTAMP"

echo "📦 Creating backup: $BACKUP_DIR"

# Full database dump
pg_dump -Fc wheels_wins_prod > "$BACKUP_DIR/full_backup.dump"

# Table-specific backups (faster to restore individual tables)
pg_dump -t user_trips wheels_wins_prod > "$BACKUP_DIR/user_trips.sql"
pg_dump -t profiles wheels_wins_prod > "$BACKUP_DIR/profiles.sql"

# Export to CSV for easy inspection
psql -c "COPY user_trips TO '$BACKUP_DIR/user_trips.csv' CSV HEADER;"

echo "✅ Backup complete: $(du -sh $BACKUP_DIR)"
```

**Strategy 2: Staged Rollout**

```typescript
// Feature flag with percentage-based rollout
export const isFeatureEnabled = (
  flagName: string,
  userId: string
): boolean => {
  const flag = FEATURE_FLAGS[flagName];

  if (!flag.enabled) return false;

  if (flag.rolloutPercentage === 100) return true;

  // Deterministic user-based rollout (same user always gets same result)
  const hash = hashCode(userId);
  return (hash % 100) < flag.rolloutPercentage;
};

// Usage
if (isFeatureEnabled('GPX_IMPORT_EXPORT', currentUser.id)) {
  return <GPXImporter />;
}
```

**Strategy 3: Circuit Breaker for New Features**

```python
# backend/app/core/circuit_breaker.py

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half_open

    async def call(self, func, *args, **kwargs):
        if self.state == 'open':
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'half_open'
            else:
                raise CircuitBreakerOpenError("Feature temporarily disabled")

        try:
            result = await func(*args, **kwargs)
            if self.state == 'half_open':
                self.state = 'closed'
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = 'open'
                # Send alert to ops team
                await send_alert(f"Circuit breaker opened for {func.__name__}")
            raise

# Usage
gpx_circuit_breaker = CircuitBreaker(failure_threshold=10, timeout=300)

@app.post("/api/v1/trips/import-gpx")
async def import_gpx(file: UploadFile):
    return await gpx_circuit_breaker.call(
        import_gpx_internal, file
    )
```

### 11.3 Monitoring & Alerting

**Key Metrics to Monitor:**

```python
# backend/app/core/monitoring.py

MIGRATION_METRICS = {
    # Database metrics
    'db_connection_count': 'Number of active database connections',
    'db_query_latency_p95': '95th percentile query latency',
    'db_deadlocks': 'Number of database deadlocks',

    # Application metrics
    'api_error_rate': 'Percentage of API requests returning 5xx',
    'api_latency_p95': '95th percentile API response time',
    'feature_flag_toggles': 'Number of times feature flags changed',

    # Feature-specific metrics
    'gpx_import_success_rate': 'Percentage of successful GPX imports',
    'route_version_creation_rate': 'Versions created per hour',
    'collaborative_editing_sessions': 'Active collaborative sessions',
    'equipment_items_created': 'Equipment items added per hour'
}

# Alert thresholds
ALERT_THRESHOLDS = {
    'api_error_rate': 5.0,  # Alert if > 5% errors
    'api_latency_p95': 3000,  # Alert if > 3s p95 latency
    'db_query_latency_p95': 500,  # Alert if > 500ms
    'gpx_import_success_rate': 85.0  # Alert if < 85% success
}
```

**Alerting Rules:**

```yaml
# monitoring/alerting_rules.yml

groups:
  - name: migration_alerts
    rules:
      - alert: HighAPIErrorRate
        expr: api_error_rate > 5
        for: 5m
        annotations:
          summary: "API error rate is {{ $value }}%"
          description: "Above threshold of 5% for 5 minutes"

      - alert: DatabaseLatencyHigh
        expr: db_query_latency_p95 > 500
        for: 10m
        annotations:
          summary: "Database latency is {{ $value }}ms"
          description: "Above threshold of 500ms for 10 minutes"

      - alert: FeatureCircuitBreakerOpen
        expr: circuit_breaker_state{feature="gpx_import"} == 1
        for: 1m
        annotations:
          summary: "Circuit breaker open for GPX import"
          description: "Feature automatically disabled due to errors"
```

---

## 12. Success Metrics

### 12.1 Migration Success Criteria

**Must-Pass Criteria (Immediate):**
- ✅ All migrations execute without errors
- ✅ All rollback scripts tested and functional
- ✅ Zero data loss or corruption
- ✅ API error rate < 1% (same as pre-migration baseline)
- ✅ API latency p95 within 10% of pre-migration baseline
- ✅ All existing tests pass
- ✅ All new tests pass

**Phase-Specific Success Criteria:**

**Phase 1 (GPX + Versioning):**
- ✅ Users can import GPX files successfully (>95% success rate)
- ✅ Users can export trips to GPX
- ✅ Route versions are saved automatically on changes
- ✅ Users can restore previous versions
- ✅ Version comparison shows accurate diff
- ✅ < 5% user-reported bugs in first week

**Phase 2 (Equipment):**
- ✅ Users can add equipment items
- ✅ Users can categorize equipment
- ✅ Equipment search returns results in < 200ms
- ✅ Maintenance logs are saved correctly
- ✅ < 3% user-reported bugs in first week

**Phase 3 (Checklists + Maps):**
- ✅ Checklists can be created from templates
- ✅ Checklist items can be checked off
- ✅ Offline map downloads complete successfully (>90% success rate)
- ✅ Offline maps render correctly
- ✅ < 2% user-reported bugs in first week

**Phase 4 (Polish + Launch):**
- ✅ All features enabled for 100% of users
- ✅ Public sharing works correctly
- ✅ Collaborative editing has < 1% conflict rate
- ✅ Overall user satisfaction > 4.0/5.0
- ✅ < 1% user churn attributed to new features

### 12.2 Key Performance Indicators (KPIs)

**Technical KPIs:**

| Metric | Baseline (Before) | Target (After) | Measurement |
|--------|-------------------|----------------|-------------|
| API p95 Latency | 250ms | < 300ms | Prometheus |
| Database Query p95 | 50ms | < 75ms | PostgreSQL logs |
| Error Rate | 0.5% | < 1% | Sentry |
| Uptime | 99.9% | ≥ 99.9% | Status page |
| Database Size | 5GB | < 10GB | pg_database_size() |

**User Engagement KPIs:**

| Metric | Target (Week 4) | Target (Week 8) | Measurement |
|--------|-----------------|-----------------|-------------|
| GPX Import Usage | 20% of users | 40% of users | Feature analytics |
| Equipment Items per User | 10 items | 25 items | Database query |
| Collaborative Trips | 5% of trips | 15% of trips | Database query |
| Offline Maps Downloaded | 10% of users | 30% of users | Feature analytics |
| Checklist Completion Rate | 60% | 80% | Feature analytics |

**Business KPIs:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature Adoption Rate | > 50% of active users use at least 1 new feature within 30 days | Analytics |
| User Retention | No decrease in 30-day retention rate | Analytics |
| Support Tickets | < 5% increase in support volume | Support system |
| Net Promoter Score (NPS) | No decrease from baseline | User survey |
| Monthly Active Users (MAU) | 5% increase (new features attract users) | Analytics |

### 12.3 Rollback Success Criteria

**Rollback is considered successful if:**
- ✅ All new tables dropped without errors
- ✅ All new columns removed from existing tables
- ✅ All RLS policies reverted to pre-migration state
- ✅ Existing user data intact (verified via spot checks)
- ✅ Application returns to pre-migration functionality
- ✅ API error rate returns to baseline within 5 minutes
- ✅ No data corruption detected

---

## Appendix A: Migration Scripts Repository

All migration scripts are located in:
```
/backend/migrations/
├── phase1_001_create_route_versions.sql
├── phase1_001_create_route_versions_rollback.sql
├── phase1_002_create_trip_collaborators.sql
├── phase1_002_create_trip_collaborators_rollback.sql
├── phase1_003_enhance_user_trips_gpx_versioning.sql
├── phase1_003_enhance_user_trips_gpx_versioning_rollback.sql
├── phase1_004_enhance_profiles_preferences.sql
├── phase1_004_enhance_profiles_preferences_rollback.sql
├── phase2_001_create_equipment_categories.sql
├── phase2_001_create_equipment_categories_rollback.sql
├── phase2_002_create_equipment.sql
├── phase2_002_create_equipment_rollback.sql
├── phase2_003_create_equipment_maintenance.sql
├── phase2_003_create_equipment_maintenance_rollback.sql
├── phase2_004_update_user_trips_rls_collaborative.sql
├── phase2_004_update_user_trips_rls_collaborative_rollback.sql
├── phase3_001_create_readiness_checklists.sql
├── phase3_001_create_readiness_checklists_rollback.sql
├── phase3_002_create_offline_map_downloads.sql
└── phase3_002_create_offline_map_downloads_rollback.sql
```

## Appendix B: Environment Variable Configuration

**Feature Flags (per environment):**

```bash
# Development (.env.development)
FEATURE_GPX=true
FEATURE_VERSIONING=true
FEATURE_COLLAB=true
FEATURE_EQUIPMENT=true
FEATURE_OFFLINE=true
FEATURE_COMMUNITY=true
FEATURE_CHECKLISTS=true

# Staging (.env.staging)
FEATURE_GPX=true
FEATURE_VERSIONING=true
FEATURE_COLLAB=true
FEATURE_EQUIPMENT=false  # Not deployed yet
FEATURE_OFFLINE=false
FEATURE_COMMUNITY=false
FEATURE_CHECKLISTS=false

# Production (.env.production)
FEATURE_GPX=false  # Dark launch - disabled until tested
FEATURE_VERSIONING=false
FEATURE_COLLAB=false
FEATURE_EQUIPMENT=false
FEATURE_OFFLINE=false
FEATURE_COMMUNITY=false
FEATURE_CHECKLISTS=false
```

## Appendix C: Contact Information

**Migration Team:**
- **Migration Lead**: [Name] - [Email]
- **Database Admin**: [Name] - [Email]
- **Backend Lead**: [Name] - [Email]
- **DevOps**: [Name] - [Email]

**Escalation Path:**
1. Alert → Migration Lead (respond within 15 min)
2. Critical Issue → Database Admin + Backend Lead (respond within 5 min)
3. Service Down → All hands + DevOps (immediate response)

**Communication Channels:**
- Slack: #migration-rollout
- Incident Response: PagerDuty
- Status Updates: Status page (status.wheelsandwins.com)

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | AI Assistant | Initial migration strategy document |

---

**End of Migration Strategy Document**

This migration strategy ensures a safe, tested, and reversible path to adding comprehensive planning features to the Wheels & Wins platform with **zero breaking changes** and **100% backward compatibility**.
