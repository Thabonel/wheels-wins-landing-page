# MCP Servers Status - October 28, 2025

## ✅ Active MCP Servers

### 1. Supabase MCP ⭐ PRIMARY TOOL
**Status**: Connected via REST API (MCP server needs session restart)
**Project**: kycoklimpzkyrecbjecn
**URL**: https://kycoklimpzkyrecbjecn.supabase.co
**Access**: Service role key configured

**Available Tools**:
- `execute_sql` - Run raw SQL queries
- `list_tables` - List all tables in schemas
- `apply_migration` - Apply DDL migrations
- `list_migrations` - View migration history
- `get_logs` - View service logs (api, postgres, auth, storage)
- `get_advisors` - Security and performance advisories
- `generate_typescript_types` - Generate types from schema
- Edge Functions: `list/get/deploy_edge_function`
- Branching: `create/list/delete/merge/reset/rebase_branch`

**Database Tables** (16/16 exist - All operational ✅):
- ✅ profiles
- ✅ calendar_events
- ✅ expenses
- ✅ budgets
- ✅ trips
- ✅ fuel_log
- ✅ maintenance_records
- ✅ pam_conversations
- ✅ pam_messages
- ✅ pam_savings_events
- ✅ posts
- ✅ comments
- ✅ likes (created Oct 28, 2025)
- ✅ storage_items
- ✅ storage_categories
- ✅ storage_locations

### 2. Memory-Keeper MCP
**Status**: ✅ Working
**Use**: Session context persistence

**Tools**:
- `context_save` - Save context items
- `context_search` - Search saved context
- `context_get` - Retrieve context
- `context_status` - Check session status
- `context_checkpoint` - Create checkpoints
- `context_restore_checkpoint` - Restore from checkpoint

### 3. GitHub MCP
**Status**: ✅ Working
**Access**: Personal access token configured

**Tools**:
- Repository operations (create, search, fork)
- File operations (read, write, push)
- Issue management (create, list, update, comment)
- Pull request management (create, list, merge, review)
- Branch operations

### 4. Filesystem MCP
**Status**: ✅ Working

**Tools**:
- `read_text_file` - Read files
- `write_file` - Write files
- `edit_file` - Line-based edits
- `list_directory` - List directory contents
- `search_files` - Recursive file search
- `get_file_info` - File metadata

### 5. Sequential Thinking MCP
**Status**: ✅ Working

**Tools**:
- `sequentialthinking` - Chain of thought reasoning
- Hypothesis generation and verification
- Multi-step problem solving

### 6. Brave Search MCP
**Status**: ✅ Working

**Tools**:
- `brave_web_search` - General web search
- `brave_local_search` - Local business search

### 7. Stripe MCP
**Status**: Configured (Live key)

**Tools**:
- Customers: `create/list_customers`
- Products: `create/list_products`
- Prices: `create/list_prices`
- Payment Links: `create_payment_link`
- Invoices: `create/list/finalize_invoice`
- Subscriptions: `list/cancel/update_subscription`
- Refunds: `create_refund`
- Balance: `retrieve_balance`

### 8. Puppeteer MCP
**Status**: Configured

**Tools**:
- Browser automation
- Screenshots
- Page interaction
- E2E testing

## ✅ Completed Actions

### 1. ~~Create Missing `likes` Table~~ COMPLETED
**Status**: ✅ Created successfully on October 28, 2025
**Location**: `docs/sql-fixes/create_likes_table.sql` (executed)
**Verification**: Table accessible via REST API

**Schema**:
```sql
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

**RLS Policies**:
- ✅ Users can view all likes
- ✅ Users can like posts (INSERT with own user_id)
- ✅ Users can unlike their own likes (DELETE)

### 2. Restart Claude Desktop Session
**Reason**: MCP server tools will become available after session restart
**When**: After completing current work

**After Restart, Verify**:
```bash
# Test Supabase MCP connection
mcp__supabase-npx__list_tables

# Test migration system
mcp__supabase-npx__list_migrations

# Get security advisors
mcp__supabase-npx__get_advisors(type: "security")
```

### 3. Run Security Audit
**After MCP server restart**:
```bash
# Check for security issues
mcp__supabase-npx__get_advisors(type: "security")

# Check for performance issues
mcp__supabase-npx__get_advisors(type: "performance")

# Review RLS policies on all tables
# Verify each table has appropriate row-level security
```

### 4. Verify Database Schema Consistency
**Compare against**: `docs/DATABASE_SCHEMA_REFERENCE.md`

**Check**:
- All documented tables exist ✅ (except likes)
- Column names match documentation
- Foreign keys are correct
- Indexes exist on commonly queried columns
- RLS policies protect user data

## 📝 Configuration File
**Location**: `~/.config/claude-desktop/claude_desktop_config.json`

**Current Status**: ✅ Restored with all servers configured

**Servers Configured**:
1. ✅ Supabase (project: kycoklimpzkyrecbjecn)
2. ✅ GitHub (personal access token)
3. ✅ Memory-Keeper
4. ✅ Stripe (live key)
5. ✅ Puppeteer

## 🎯 Next Session Checklist

After session restart:
- [ ] Verify Supabase MCP tools work
- [x] ~~Execute `create_likes_table.sql` in Supabase dashboard~~ ✅ DONE
- [ ] Run `mcp__supabase-npx__get_advisors` for security check
- [ ] Run `mcp__supabase-npx__get_advisors` for performance check
- [x] ~~Verify all 16 tables exist (including likes)~~ ✅ DONE
- [x] ~~Update DATABASE_SCHEMA_REFERENCE.md if needed~~ ✅ DONE

## 📚 Documentation Updated
- ✅ `CLAUDE.md` - Added MCP server details
- ✅ `docs/sql-fixes/create_likes_table.sql` - Created missing table SQL
- ✅ This status document

## 🔗 Quick Links
- Supabase Dashboard: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn
- Database Schema Reference: `docs/DATABASE_SCHEMA_REFERENCE.md`
- PAM System Architecture: `docs/PAM_SYSTEM_ARCHITECTURE.md`
- MCP Config: `~/.config/claude-desktop/claude_desktop_config.json`

---
**Created**: October 28, 2025
**Status**: Ready for likes table creation and security audit
