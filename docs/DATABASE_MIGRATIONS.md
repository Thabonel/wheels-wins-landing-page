# Database Migration Strategy for Wheels & Wins

**Last Updated:** October 2, 2025
**Status:** Production Guidelines
**Owner:** Database Team

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Naming Convention](#migration-naming-convention)
3. [Version Tracking System](#version-tracking-system)
4. [Testing Procedures](#testing-procedures)
5. [Rollback Strategy](#rollback-strategy)
6. [Production Deployment](#production-deployment)
7. [Common Migration Patterns](#common-migration-patterns)
8. [Emergency Procedures](#emergency-procedures)

---

## Overview

### Purpose

This document establishes clear procedures for database schema evolution to ensure:
- **Safety:** No data loss or corruption
- **Reversibility:** All migrations can be rolled back
- **Traceability:** Full history of schema changes
- **Consistency:** Staging and production stay in sync

### Migration Philosophy

**Core Principles:**
1. **Never drop columns immediately** - Deprecate first, drop later
2. **Always provide rollback SQL** - Plan for failure
3. **Test on staging first** - Production deploys only after validation
4. **Version everything** - Track what's applied where
5. **Document breaking changes** - Alert dependent services

---

## Migration Naming Convention

### File Naming Format

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Components:**
- `YYYYMMDD`: Year, month, day (e.g., 20251002)
- `HHMMSS`: Hour, minute, second in UTC (e.g., 143000 for 2:30 PM)
- `descriptive_name`: Snake_case description of change

**Examples:**
```
20251002143000_add_tool_calls_to_pam_conversations.sql
20251003090000_create_conversation_episodes_table.sql
20251004120000_add_vector_index_to_episodes.sql
20251005150000_migrate_old_expense_data.sql
```

### Why Timestamps?

- **Automatic ordering:** Migrations run in chronological order
- **Collision prevention:** Timestamps are unique (second precision)
- **Git safety:** No merge conflicts on filenames
- **Deployment traceability:** Know when migration was created

---

## Version Tracking System

### Schema Versions Table

```sql
-- supabase/migrations/20251002120000_create_schema_versions_table.sql

CREATE TABLE IF NOT EXISTS schema_versions (
    version TEXT PRIMARY KEY,                    -- Migration filename
    applied_at TIMESTAMPTZ DEFAULT NOW(),        -- When applied
    applied_by TEXT,                             -- Who/what applied it
    description TEXT NOT NULL,                   -- Human-readable description
    rollback_sql TEXT NOT NULL,                  -- SQL to undo this migration
    checksum TEXT,                               -- SHA256 of migration file
    execution_time_ms INTEGER,                   -- How long it took
    status TEXT DEFAULT 'applied',               -- 'applied' | 'rolled_back' | 'failed'
    metadata JSONB                               -- Additional context
);

CREATE INDEX idx_schema_versions_applied_at ON schema_versions(applied_at DESC);
CREATE INDEX idx_schema_versions_status ON schema_versions(status);

-- Insert this migration itself
INSERT INTO schema_versions (
    version,
    description,
    rollback_sql,
    applied_by
) VALUES (
    '20251002120000_create_schema_versions_table.sql',
    'Create schema_versions table for migration tracking',
    'DROP TABLE IF EXISTS schema_versions CASCADE;',
    'initial_setup'
);
```

### Recording Migrations

**Automatic Recording (Preferred):**

```sql
-- Every migration must include this at the end:

INSERT INTO schema_versions (
    version,
    description,
    rollback_sql,
    applied_by,
    checksum
) VALUES (
    '20251002143000_add_tool_calls_to_pam_conversations.sql',
    'Add tool_calls_json column to pam_conversations for function call tracking',
    '
        ALTER TABLE pam_conversations
        DROP COLUMN IF EXISTS tool_calls_json;
    ',
    'migration_system',
    'sha256:abc123...'
);
```

### Checking Applied Migrations

```sql
-- Which migrations are applied?
SELECT
    version,
    applied_at,
    description,
    status
FROM schema_versions
ORDER BY applied_at DESC;

-- Is specific migration applied?
SELECT EXISTS (
    SELECT 1
    FROM schema_versions
    WHERE version = '20251002143000_add_tool_calls_to_pam_conversations.sql'
    AND status = 'applied'
) AS is_applied;

-- Migrations in last 30 days
SELECT
    version,
    applied_at,
    execution_time_ms,
    status
FROM schema_versions
WHERE applied_at > NOW() - INTERVAL '30 days'
ORDER BY applied_at DESC;
```

---

## Testing Procedures

### Pre-Deployment Checklist

**Before writing migration:**
- [ ] Document reason for change (link to issue/PR)
- [ ] Identify affected tables and columns
- [ ] Check for foreign key dependencies
- [ ] Review RLS policies that may be affected
- [ ] Estimate migration execution time
- [ ] Plan rollback strategy

**Migration file requirements:**
- [ ] Valid SQL syntax (test locally)
- [ ] Includes description comment at top
- [ ] Idempotent (safe to run multiple times)
- [ ] Records itself in schema_versions
- [ ] Includes rollback SQL
- [ ] No hardcoded UUIDs or user-specific data

### Local Testing

```bash
# 1. Reset local database to clean state
supabase db reset

# 2. Apply all migrations
supabase db push

# 3. Verify migration applied
psql $DATABASE_URL -c "SELECT * FROM schema_versions WHERE version LIKE '%YOUR_MIGRATION%';"

# 4. Test rollback
psql $DATABASE_URL -c "$(cat rollback.sql)"

# 5. Reapply migration
psql $DATABASE_URL -f YOUR_MIGRATION.sql

# 6. Run application tests
npm run test
cd backend && pytest
```

### Staging Validation

**Required Steps:**

1. **Apply to Staging Database**
   ```bash
   # Via Supabase CLI
   supabase --project-ref YOUR_STAGING_REF db push

   # Or manual (if complex)
   psql $STAGING_DATABASE_URL -f migrations/YOUR_MIGRATION.sql
   ```

2. **Verify Schema Changes**
   ```sql
   -- Check table structure
   \d+ pam_conversations

   -- Check indexes
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'pam_conversations';

   -- Check RLS policies
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'pam_conversations';
   ```

3. **Run Integration Tests**
   ```bash
   # Test against staging backend
   export API_BASE_URL=https://wheels-wins-backend-staging.onrender.com
   npm run test:integration

   # Test PAM functionality
   python backend/tests/test_pam_conversations.py --env=staging
   ```

4. **Smoke Test Critical Flows**
   - User signup/login
   - PAM conversation
   - Expense creation
   - Trip planning
   - Social post creation

5. **Monitor for 24 Hours**
   - Check error logs
   - Monitor query performance
   - Watch for schema-related errors

6. **Approval Required**
   - Tech lead reviews migration
   - QA signs off on testing
   - Product owner confirms no user impact

---

## Rollback Strategy

### Types of Rollbacks

**1. Immediate Rollback (During Deployment)**

If migration fails during application:
```sql
-- Execute rollback SQL from schema_versions
DO $$
DECLARE
    rollback_sql TEXT;
BEGIN
    -- Get rollback SQL
    SELECT rollback_sql INTO rollback_sql
    FROM schema_versions
    WHERE version = 'YOUR_MIGRATION.sql';

    -- Execute rollback
    EXECUTE rollback_sql;

    -- Mark as rolled back
    UPDATE schema_versions
    SET status = 'rolled_back'
    WHERE version = 'YOUR_MIGRATION.sql';
END $$;
```

**2. Post-Deployment Rollback (Issue Discovered Later)**

```bash
# 1. Stop deployments
git revert MIGRATION_COMMIT

# 2. Create rollback migration
cat > supabase/migrations/20251002160000_rollback_tool_calls.sql <<EOF
-- Rollback: Remove tool_calls_json column

ALTER TABLE pam_conversations
DROP COLUMN IF EXISTS tool_calls_json;

-- Update schema version
UPDATE schema_versions
SET status = 'rolled_back'
WHERE version = '20251002143000_add_tool_calls_to_pam_conversations.sql';

-- Record rollback
INSERT INTO schema_versions (version, description, rollback_sql, applied_by)
VALUES (
    '20251002160000_rollback_tool_calls.sql',
    'Rollback tool_calls_json column due to performance issues',
    'ALTER TABLE pam_conversations ADD COLUMN tool_calls_json JSONB;',
    'emergency_rollback'
);
EOF

# 3. Apply rollback
supabase db push

# 4. Deploy application rollback
git push origin main
```

### Rollback Testing

**Test rollback on staging BEFORE production:**

```bash
# 1. Apply migration to staging
psql $STAGING_URL -f migrations/20251002143000_add_tool_calls.sql

# 2. Verify migration
psql $STAGING_URL -c "\d+ pam_conversations"

# 3. Execute rollback
psql $STAGING_URL -c "
    ALTER TABLE pam_conversations DROP COLUMN tool_calls_json;
"

# 4. Verify rollback
psql $STAGING_URL -c "\d+ pam_conversations"

# 5. Re-apply migration (ensure idempotent)
psql $STAGING_URL -f migrations/20251002143000_add_tool_calls.sql

# If all pass, safe for production
```

---

## Production Deployment

### Deployment Window

**Recommended Times:**
- **Best:** Sunday 2-4 AM UTC (lowest traffic)
- **Good:** Weekday 2-4 AM UTC
- **Avoid:** Friday afternoons, holiday weekends, during marketing campaigns

### Pre-Deployment

**1 Week Before:**
- [ ] Migration tested on staging for 1 week
- [ ] No issues reported
- [ ] Team notified of upcoming change
- [ ] Rollback procedure documented

**1 Day Before:**
- [ ] Create backup snapshot (Supabase automatic)
- [ ] Verify staging still healthy
- [ ] Alert on-call engineer
- [ ] Prepare rollback migration

**1 Hour Before:**
- [ ] All hands on deck (2+ engineers)
- [ ] Monitoring dashboards open
- [ ] Communication channel ready (Slack)

### Deployment Steps

```bash
#!/bin/bash
# deploy_migration.sh

set -e  # Exit on any error

MIGRATION_FILE="$1"
ENVIRONMENT="$2"  # 'staging' or 'production'

echo "🚀 Deploying migration: $MIGRATION_FILE to $ENVIRONMENT"

# 1. Validate environment
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    echo "❌ Invalid environment. Must be 'staging' or 'production'"
    exit 1
fi

# 2. Check if already applied
APPLIED=$(psql $DATABASE_URL -tAc "
    SELECT COUNT(*) FROM schema_versions
    WHERE version = '$(basename $MIGRATION_FILE)'
    AND status = 'applied'
")

if [ "$APPLIED" -gt 0 ]; then
    echo "⚠️  Migration already applied. Exiting."
    exit 0
fi

# 3. Create backup (production only)
if [ "$ENVIRONMENT" == "production" ]; then
    echo "💾 Creating backup snapshot..."
    # Supabase automatically creates snapshots
    sleep 5
fi

# 4. Apply migration
echo "📝 Applying migration..."
START_TIME=$(date +%s%3N)

psql $DATABASE_URL -f "$MIGRATION_FILE" || {
    echo "❌ Migration failed! Rolling back..."
    # Execute rollback
    psql $DATABASE_URL -c "
        DO \$\$
        DECLARE rollback_sql TEXT;
        BEGIN
            SELECT rollback_sql INTO rollback_sql
            FROM schema_versions
            WHERE version = '$(basename $MIGRATION_FILE)';
            EXECUTE rollback_sql;
        END \$\$;
    "
    exit 1
}

END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

echo "✅ Migration applied successfully in ${DURATION}ms"

# 5. Verify migration
echo "🔍 Verifying migration..."
psql $DATABASE_URL -c "
    SELECT version, applied_at, status
    FROM schema_versions
    WHERE version = '$(basename $MIGRATION_FILE)';
"

# 6. Run smoke tests
echo "🧪 Running smoke tests..."
npm run test:smoke -- --env=$ENVIRONMENT

echo "✅ Migration deployment complete!"
```

### Post-Deployment

**Immediate (First 15 minutes):**
- [ ] Check application logs for errors
- [ ] Verify PAM still functional
- [ ] Test expense creation
- [ ] Monitor Sentry for new errors

**Next Hour:**
- [ ] Watch query performance metrics
- [ ] Monitor database CPU/memory
- [ ] Check slow query log
- [ ] Verify no user reports

**Next 24 Hours:**
- [ ] Daily error rate check
- [ ] Performance regression check
- [ ] User feedback monitoring

---

## Common Migration Patterns

### Pattern 1: Adding a Column

**Safe (Non-Breaking):**

```sql
-- 20251002143000_add_tool_calls_to_pam_conversations.sql

-- Add column with default value
ALTER TABLE pam_conversations
ADD COLUMN IF NOT EXISTS tool_calls_json JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN pam_conversations.tool_calls_json IS
    'Array of Claude tool calls made during conversation turn';

-- Optional: Create index for queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_tool_calls
ON pam_conversations USING GIN (tool_calls_json);

-- Record migration
INSERT INTO schema_versions (version, description, rollback_sql, applied_by)
VALUES (
    '20251002143000_add_tool_calls_to_pam_conversations.sql',
    'Add tool_calls_json column to track Claude function calls',
    '
        DROP INDEX IF EXISTS idx_pam_conversations_tool_calls;
        ALTER TABLE pam_conversations DROP COLUMN IF EXISTS tool_calls_json;
    ',
    'migration_system'
);
```

**Key Points:**
- Use `IF NOT EXISTS` (idempotent)
- Provide default value (non-breaking)
- Use `CONCURRENTLY` for index (no table lock)
- Include rollback SQL

---

### Pattern 2: Removing a Column (Two-Phase)

**Phase 1: Deprecate (Week 1)**

```sql
-- 20251002143000_deprecate_old_metadata_column.sql

-- Mark column as deprecated (don't drop yet)
COMMENT ON COLUMN pam_conversations.old_metadata IS
    'DEPRECATED: Use metadata_v2 instead. Will be removed 2025-11-01';

-- Stop writing to this column (application code)
-- Ensure all reads use new column

-- Record deprecation
INSERT INTO schema_versions (version, description, rollback_sql, applied_by)
VALUES (
    '20251002143000_deprecate_old_metadata_column.sql',
    'Deprecate old_metadata column in preparation for removal',
    '
        COMMENT ON COLUMN pam_conversations.old_metadata IS NULL;
    ',
    'migration_system'
);
```

**Phase 2: Remove (Week 3+)**

```sql
-- 20251020143000_remove_old_metadata_column.sql

-- Verify no longer in use (check application code)
-- Only proceed if all references removed

ALTER TABLE pam_conversations
DROP COLUMN IF EXISTS old_metadata;

-- Record removal
INSERT INTO schema_versions (version, description, rollback_sql, applied_by)
VALUES (
    '20251020143000_remove_old_metadata_column.sql',
    'Remove deprecated old_metadata column',
    '
        ALTER TABLE pam_conversations
        ADD COLUMN old_metadata JSONB;
    ',
    'migration_system'
);
```

---

### Pattern 3: Renaming a Column (Three-Phase)

**Phase 1: Add New Column**

```sql
-- 20251002143000_add_context_data_v2_column.sql

ALTER TABLE pam_conversations
ADD COLUMN IF NOT EXISTS context_data_v2 JSONB;

-- Copy existing data
UPDATE pam_conversations
SET context_data_v2 = context_data
WHERE context_data_v2 IS NULL;
```

**Phase 2: Update Application (Code Deploy)**

```python
# Update all code to write to both columns
await db.insert_conversation(
    context_data=data,      # Old (keep for rollback)
    context_data_v2=data    # New
)

# Update reads to prefer new column
context = row.context_data_v2 or row.context_data
```

**Phase 3: Remove Old Column**

```sql
-- 20251020143000_remove_old_context_data_column.sql

-- After verifying new column works for 2+ weeks
ALTER TABLE pam_conversations
DROP COLUMN IF EXISTS context_data;

-- Rename new column (optional)
ALTER TABLE pam_conversations
RENAME COLUMN context_data_v2 TO context_data;
```

---

### Pattern 4: Data Migration

```sql
-- 20251002143000_migrate_expense_categories.sql

-- Migrate old category names to new standard
UPDATE expenses
SET category = CASE
    WHEN category = 'fuel' THEN 'gas'
    WHEN category = 'camping' THEN 'campground'
    WHEN category = 'rv_maintenance' THEN 'maintenance'
    ELSE category
END
WHERE category IN ('fuel', 'camping', 'rv_maintenance');

-- Log affected rows
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % expense records', affected_count;
END $$;

-- Record migration
INSERT INTO schema_versions (version, description, rollback_sql, applied_by, metadata)
VALUES (
    '20251002143000_migrate_expense_categories.sql',
    'Standardize expense category names',
    '
        UPDATE expenses
        SET category = CASE
            WHEN category = ''gas'' THEN ''fuel''
            WHEN category = ''campground'' THEN ''camping''
            WHEN category = ''maintenance'' THEN ''rv_maintenance''
            ELSE category
        END
        WHERE category IN (''gas'', ''campground'', ''maintenance'');
    ',
    'migration_system',
    '{"affected_tables": ["expenses"], "estimated_rows": 1000}'::jsonb
);
```

---

### Pattern 5: Creating an Index

```sql
-- 20251002143000_add_index_pam_conversations_user_created.sql

-- Use CONCURRENTLY to avoid table lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pam_conversations_user_created
ON pam_conversations(user_id, created_at DESC);

-- Verify index created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_pam_conversations_user_created'
    ) THEN
        RAISE EXCEPTION 'Index creation failed';
    END IF;
END $$;

-- Analyze table for query planner
ANALYZE pam_conversations;

-- Record migration
INSERT INTO schema_versions (version, description, rollback_sql, applied_by)
VALUES (
    '20251002143000_add_index_pam_conversations_user_created.sql',
    'Add composite index for user conversation queries',
    'DROP INDEX CONCURRENTLY IF EXISTS idx_pam_conversations_user_created;',
    'migration_system'
);
```

**Performance Note:**
`CREATE INDEX CONCURRENTLY` runs in background and doesn't lock table for writes.

---

## Emergency Procedures

### Critical Migration Failure

**Scenario:** Migration breaks production

**Immediate Actions (First 5 minutes):**

1. **Alert team**
   ```
   🚨 CRITICAL: Migration failure in production
   Migration: 20251002143000_add_tool_calls.sql
   Error: [error message]
   Action: Rolling back now
   ```

2. **Execute rollback**
   ```sql
   -- Get rollback SQL
   \x on
   SELECT rollback_sql FROM schema_versions
   WHERE version = '20251002143000_add_tool_calls.sql';
   \x off

   -- Execute rollback
   BEGIN;
   [paste rollback SQL]
   COMMIT;

   -- Mark as rolled back
   UPDATE schema_versions
   SET status = 'rolled_back'
   WHERE version = '20251002143000_add_tool_calls.sql';
   ```

3. **Verify application health**
   ```bash
   # Check error rate
   curl https://pam-backend.onrender.com/api/health

   # Test PAM
   curl -X POST https://pam-backend.onrender.com/api/v1/pam-2/chat \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"message": "hi"}'
   ```

4. **Deploy application rollback**
   ```bash
   git revert MIGRATION_COMMIT
   git push origin main
   ```

**Post-Incident (Next Hour):**

1. **Incident report**
   - What failed
   - Why it failed
   - Impact (users affected, downtime)
   - Root cause
   - Prevention measures

2. **Update migration with fix**
   - Add missing constraint
   - Fix syntax error
   - Improve rollback logic

3. **Re-test on staging**
   - Apply fixed migration
   - Verify no issues
   - Soak for 24 hours

---

### Data Corruption

**Scenario:** Migration corrupted user data

**Immediate Actions:**

1. **Stop writes to affected table**
   ```sql
   -- Revoke INSERT/UPDATE permissions temporarily
   REVOKE INSERT, UPDATE ON pam_conversations FROM authenticated;
   ```

2. **Restore from backup**
   ```bash
   # Via Supabase dashboard:
   # Settings → Database → Backups → Restore to point-in-time
   # Select timestamp BEFORE migration
   ```

3. **Notify affected users** (if significant)
   - Email/notification
   - Explain issue
   - Compensation if needed

---

## Migration Review Checklist

Before merging migration PR:

**SQL Quality:**
- [ ] Syntax validated locally
- [ ] Idempotent (uses IF NOT EXISTS, IF EXISTS)
- [ ] No hardcoded values (UUIDs, timestamps)
- [ ] Includes comments explaining purpose
- [ ] Uses CONCURRENTLY for indexes

**Safety:**
- [ ] Rollback SQL tested and included
- [ ] Non-breaking change (or has deprecation plan)
- [ ] No DROP TABLE without 2-phase approach
- [ ] Foreign keys validated
- [ ] RLS policies updated if needed

**Documentation:**
- [ ] Records itself in schema_versions
- [ ] Linked to GitHub issue/PR
- [ ] Breaking changes documented
- [ ] Affected services identified

**Testing:**
- [ ] Tested locally
- [ ] Applied to staging (24+ hours ago)
- [ ] Integration tests pass
- [ ] Smoke tests pass
- [ ] Rollback tested on staging

**Approval:**
- [ ] Tech lead reviewed
- [ ] QA approved
- [ ] Ready for production window

---

## Supabase CLI Reference

### Common Commands

```bash
# View current migrations
supabase db diff

# Create new migration
supabase migration new add_column_to_table

# Apply migrations locally
supabase db reset

# Push to remote (staging/production)
supabase --project-ref YOUR_REF db push

# Generate types (after schema change)
supabase gen types typescript --project-id YOUR_PROJECT > types.ts

# View migration status
supabase db remote changes
```

---

## Resources

**Internal:**
- [PAM Performance Improvements](PAM_PERFORMANCE_IMPROVEMENTS.md)
- [How PAM Works](HOW_PAM_WORKS.md)
- [CLAUDE.md](../CLAUDE.md) - Project guidelines

**External:**
- [Supabase Migrations Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)

---

**Document Status:** Production Guidelines
**Next Review:** Quarterly (or after major migration)
**Owner:** Database Team
