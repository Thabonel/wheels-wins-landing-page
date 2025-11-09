# MCP Server Setup & Configuration

**Project:** Wheels & Wins Landing Page
**Date:** January 15, 2025
**Status:** ✅ Fully Configured

## Overview

This project uses **Model Context Protocol (MCP)** servers to extend Claude Code's capabilities with external tools and services.

## Active MCP Servers

### 1. Serena - Semantic Code Analysis ✅

**Purpose:** Intelligent code search and analysis across the entire codebase

**Provider:** `@oraios/serena`
**Status:** Active
**Command:** `uvx --from git+https://github.com/oraios/serena serena-mcp-server`

**Configuration:**
```json
{
  "command": "uvx",
  "args": [
    "--from", "git+https://github.com/oraios/serena",
    "serena-mcp-server",
    "--project", "/Users/thabonel/Code/wheels-wins-landing-page",
    "--context", "desktop-app",
    "--mode", "interactive,editing",
    "--log-level", "INFO"
  ]
}
```

**Use Cases:**
- Semantic code search (find similar patterns)
- Analyze code dependencies
- Navigate complex codebases
- Understand code relationships

**Example:**
```
"Find all components that use the PAM WebSocket service"
"Show me where budget calculations happen"
"Analyze dependencies for the trip planning feature"
```

---

### 2. Supabase (unimog) - Database Operations ✅

**Purpose:** Direct Supabase database access for Wheels & Wins

**Provider:** `@supabase/mcp-server-supabase`
**Status:** Active
**Project Ref:** `ydevatqwkoccxhtejdor`
**Project URL:** https://ydevatqwkoccxhtejdor.supabase.co

**Capabilities:**
- Direct SQL query execution
- Bypass RLS for admin operations
- Table schema management
- Database migrations
- Storage bucket operations

**Security Level:** 🔴 **Service Role** (Full database access)

**Use Cases:**
- Fix RLS policy issues
- Emergency database repairs
- Schema migrations
- Data cleanup operations
- Troubleshooting database problems

**Example:**
```sql
-- Check admin user status
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- Fix RLS policy
ALTER POLICY "Users can only view their own data" ON profiles
USING (auth.uid() = id);

-- Direct data update (bypasses RLS)
UPDATE user_settings SET pam_enabled = true WHERE user_id = '...';
```

**⚠️ Security Warning:**
- Service role key provides FULL database access
- Can bypass all RLS policies
- Use with extreme caution
- Never commit keys to version control

---

### 3. Memory Keeper - Session Context ✅

**Purpose:** Persist context and memory across Claude Code sessions

**Provider:** `@context7/mcp-server-memory-keeper`
**Status:** Active
**Command:** `npx -y @context7/mcp-server-memory-keeper`

**Use Cases:**
- Save important decisions between sessions
- Track project state and progress
- Maintain conversation history
- Store debugging insights
- Preserve context across chat compaction

**Example:**
```
"Save this PAM architecture decision to memory"
"What did we decide about the budget tool integration?"
"Show me the context from yesterday's session"
```

---

### 4. Linear - Issue Tracking ✅

**Purpose:** Linear project management integration

**Provider:** `@mseep/linear-mcp`
**Status:** Active
**Command:** `npx -y @mseep/linear-mcp`

**Use Cases:**
- Create and manage Linear issues
- Track project tasks
- Link code changes to issues
- Automated project management

**Example:**
```
"Create a Linear issue for the PAM WebSocket reconnection bug"
"Show me open issues for the trip planning feature"
"Update issue status to In Progress"
```

---

### 5. GitHub - Repository Operations ✅

**Purpose:** GitHub repository management

**Provider:** Built-in (`mcp__github__` functions)
**Status:** Active (built-in)

**Capabilities:**
- Create/update files
- Manage pull requests
- Issue management
- Repository operations
- Branch management

**Example:**
```
"Create a pull request for this PAM fix"
"List all open issues with label 'pam'"
"Create a new branch for the budget feature"
```

---

## Additional Available Servers

### Render - Deployment Management

**Status:** ⬜ Not Installed
**Provider:** `@render/mcp-server`

**Installation:**
```bash
npm install -g @render/mcp-server
```

**Use Cases:**
- Deploy backend services to Render
- Monitor service health
- Manage environment variables
- View deployment logs

**Why Not Installed:**
- Current deployment via Render dashboard
- Git-based auto-deployment configured
- Manual deployment preferred for production

---

## Configuration Location

**Claude Desktop Config:**
```
~/.config/claude-desktop/claude_desktop_config.json
```

**Project Documentation:**
```
/Users/thabonel/Code/wheels-wins-landing-page/.mcp.json
```

**Security:**
- API keys stored in Claude Desktop config (NOT in project)
- `.mcp.json` added to `.gitignore`
- Service role keys NEVER committed to git

---

## Quick Commands

### Database Operations
```bash
# Use Supabase MCP tools
"Query the profiles table for admin users"
"Show me the schema for pam_conversations table"
"Fix the RLS policy on expenses table"
```

### Code Analysis
```bash
# Use Serena
"Find all files that import pamService"
"Show me the dependency graph for PAM tools"
"Search for components using WebSocket"
```

### Session Memory
```bash
# Use Memory Keeper
"Save this decision about Claude Sonnet 4.5 migration"
"What did we discuss about the budget tools?"
"Show me notes from the last PAM debugging session"
```

### Issue Tracking
```bash
# Use Linear or GitHub
"Create an issue for PAM reconnection bug"
gh issue create
gh issue list --label "pam"
```

---

## Verification

### Check MCP Servers Status

**Claude Desktop:**
1. Open Claude Desktop
2. Go to Settings > Developer
3. View MCP Servers tab
4. Verify all servers show "Connected"

**From Terminal:**
```bash
# Test Serena
uvx --from git+https://github.com/oraios/serena serena-mcp-server --help

# Test Supabase MCP
npx -y @supabase/mcp-server-supabase --help

# Test Memory Keeper
npx -y @context7/mcp-server-memory-keeper --help

# Test Linear
npx -y @mseep/linear-mcp --help
```

---

## Troubleshooting

### Server Not Connecting

**Issue:** MCP server shows "Disconnected" in Claude Desktop

**Solution:**
1. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`
2. Verify command exists: `which uvx` or `which npx`
3. Test command manually in terminal
4. Restart Claude Desktop
5. Check for error messages in logs

### Permission Denied

**Issue:** Cannot execute MCP server command

**Solution:**
```bash
# Install uvx if missing
pip install uv

# Install npx if missing
npm install -g npm

# Verify installations
which uvx
which npx
```

### Database Access Issues

**Issue:** Cannot connect to Supabase

**Solution:**
1. Verify project ref: `ydevatqwkoccxhtejdor`
2. Check service role key is correct
3. Test connection via Supabase dashboard
4. Verify network connectivity

---

## Best Practices

### Security
- ✅ Never commit API keys or service role keys
- ✅ Use `.gitignore` to exclude `.mcp.json`
- ✅ Store sensitive keys in Claude Desktop config only
- ✅ Use service role access sparingly (admin operations only)

### Development
- ✅ Use Serena for code exploration before editing
- ✅ Use Memory Keeper to preserve important context
- ✅ Use Supabase MCP for database debugging
- ✅ Use GitHub/Linear for task tracking

### Production
- ⚠️ Never use service role keys in production code
- ⚠️ Test database changes in staging first
- ⚠️ Use RLS policies for all user-facing queries
- ⚠️ Monitor MCP server usage for performance

---

## Project-Specific Notes

### Wheels & Wins Context

**Primary Database:** `supabase-unimog` (ydevatqwkoccxhtejdor)

**Other Supabase Projects:**
- `supabase-wheels` (kycoklimpzkyrecbjecn) - Different project
- `supabase-action` (kciuuxoqxfsogjuqflou) - Different project

**Serena Configuration:**
- Pre-configured for `/Users/thabonel/Code/wheels-wins-landing-page`
- Interactive editing mode enabled
- Desktop app context

**Key Tables:**
- `profiles` - User accounts
- `pam_conversations` - PAM chat history
- `expenses` - Financial tracking
- `budgets` - Budget management
- `trips` - Travel planning
- `maintenance_records` - Vehicle maintenance

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project instructions
- [PAM_FINAL_PLAN.md](pam-rebuild-2025/PAM_FINAL_PLAN.md) - PAM rebuild plan
- [architecture.md](../backend/docs/architecture.md) - Backend architecture
- [api.md](../backend/docs/api.md) - API documentation

---

**Last Updated:** January 15, 2025
**Maintainer:** Claude Code with MCP servers
**Status:** Production-ready with all servers operational
