# MCP Setup Session - January 11, 2025

## Session Overview

Successfully configured 3 Supabase MCP servers for simultaneous access to all project databases from Claude Desktop.

## Issues Addressed

### 1. Multiple Project Database Access
**Problem:** User works on 3 separate projects simultaneously, each with its own Supabase database:
- Wheels & Wins Landing Page (kycoklimpzkyrecbjecn)
- Unimog Community Hub (ydevatqwkoccxhtejdor)
- Action Insight Pilot (kciuuxoqxfsogjuqflou)

**Previous State:** Single MCP server pointing to only one project

**Solution:** Configured 3 separate MCP servers with unique names for concurrent access

### 2. Admin Content Moderation Access (Ongoing)
**Status:** RLS policies updated with JWT role check
- Added `current_setting('request.jwt.claims', true)::json->>'role'` check
- Policies now validate `role='admin'` from JWT token
- SQL executed: `FIX_ADMIN_RLS_FINAL.sql`
- Awaiting user to test with page refresh

### 3. PAM WebSocket Connection Issues (Documented)
**Status:** Root cause identified, awaiting backend log investigation
- Diagnostic created: `docs/PAM_WEBSOCKET_DIAGNOSTIC_JAN_11_2025.md`
- Likely cause: PAM Orchestrator initialization failure
- User needs to check Render backend logs for orchestrator errors

## Configuration Changes

### MCP Configuration Updated
**File:** `~/.config/claude-desktop/claude_desktop_config.json`

**Added 3 Supabase MCP Servers:**

```json
{
  "mcpServers": {
    "supabase-wheels": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=kycoklimpzkyrecbjecn"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "[configured]",
        "SUPABASE_SERVICE_ROLE_KEY": "[configured]"
      }
    },
    "supabase-unimog": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=ydevatqwkoccxhtejdor"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "[configured]",
        "SUPABASE_SERVICE_ROLE_KEY": "[configured]"
      }
    },
    "supabase-action": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=kciuuxoqxfsogjuqflou"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "[configured]",
        "SUPABASE_SERVICE_ROLE_KEY": "[configured]"
      }
    }
  }
}
```

### Credentials Configured
- **Access Token:** Same token used for all 3 projects (account-level)
- **Service Role Keys:** Unique key for each project (project-level admin access)

**Project Mappings:**
1. **Wheels & Wins** (kycoklimpzkyrecbjecn) → `supabase-wheels` MCP
2. **Unimog Community Hub** (ydevatqwkoccxhtejdor) → `supabase-unimog` MCP
3. **Action Insight Pilot** (kciuuxoqxfsogjuqflou) → `supabase-action` MCP

## Files Created

### Documentation
1. **SUPABASE_MCP_CREDENTIALS_GUIDE.md** (project root)
   - Step-by-step credential setup instructions
   - Direct links to Supabase dashboard for each project
   - Restart instructions for Claude Desktop

2. **docs/MCP_SETUP_SESSION_JAN_11_2025.md** (this file)
   - Complete session documentation
   - Configuration details
   - Next steps

### SQL Fixes (from earlier in session)
1. **FIX_ADMIN_RLS_FINAL.sql** (project root)
   - Updated RLS policies with JWT role check
   - Fixes admin content moderation access

2. **docs/sql-fixes/test_content_moderation_access.sql**
   - Clean SQL for testing permissions and data
   - No comments (per anti-AI-slop guidelines)

## Expected MCP Tools After Restart

Once Claude Desktop is restarted, these MCP tool sets will be available:

### Wheels & Wins Database
- `mcp__supabase-wheels__execute_sql`
- `mcp__supabase-wheels__list_tables`
- `mcp__supabase-wheels__describe_table`
- `mcp__supabase-wheels__*` (all Supabase operations)

### Unimog Community Hub Database
- `mcp__supabase-unimog__execute_sql`
- `mcp__supabase-unimog__list_tables`
- `mcp__supabase-unimog__describe_table`
- `mcp__supabase-unimog__*` (all Supabase operations)

### Action Insight Pilot Database
- `mcp__supabase-action__execute_sql`
- `mcp__supabase-action__list_tables`
- `mcp__supabase-action__describe_table`
- `mcp__supabase-action__*` (all Supabase operations)

## Next Steps

### Immediate Actions Required
1. ✅ **MCP credentials configured** (completed)
2. ⬜ **Restart Claude Desktop** (user action)
   - Quit completely: `Cmd+Q`
   - Reopen Claude Desktop
3. ⬜ **Verify MCP activation** (new conversation)
   - Check for `mcp__supabase-*__*` tools
   - Test database queries on all 3 projects

### Testing & Validation
1. ⬜ **Test admin content moderation access**
   - Refresh page after RLS policy updates
   - Verify 403 errors are resolved
   - Check if empty table vs permission error is clarified

2. ⬜ **Investigate PAM WebSocket issues**
   - Check Render backend logs for orchestrator errors
   - Look for errors after "WebSocket connection accepted"
   - Reference: `docs/PAM_WEBSOCKET_DIAGNOSTIC_JAN_11_2025.md`

### Translation System (Previous Session - 80% Complete)
1. ⬜ Get Anthropic API key for translation script
2. ⬜ Generate translations for 5 languages
3. ⬜ Convert remaining 5 components to i18n

## Key Learnings

### Multi-Project MCP Setup
- **Pattern:** Multiple MCP servers with unique names can run simultaneously
- **Naming:** Use descriptive names like `supabase-{project}` for clarity
- **Credentials:** Same access token works for all projects, unique service role key per project

### SQL Best Practices (Anti-AI-Slop)
- Write clean SQL without comments or explanatory text
- No "run this separately" instructions in SQL files
- User prefers executable scripts over documented tutorials

### Security Handling
- Credentials can be temporarily shared for configuration
- Clear from conversation memory after writing to config
- Local config file remains secure on user's machine

## Technical Details

### Supabase MCP Server
- **Package:** `@supabase/mcp-server-supabase`
- **Installation:** `npx -y @supabase/mcp-server-supabase`
- **Authentication:** Requires both access token and service role key
- **Project Ref:** Specified via `--project-ref=` argument

### Access Token vs Service Role Key
- **Access Token:** Account-level, for Supabase Management API
- **Service Role Key:** Project-level, for PostgreSQL access (bypasses RLS)
- **Format:** Access token is `sbp_*`, service role is JWT (eyJ...)

### MCP Server Lifecycle
1. Config file updated with credentials
2. Claude Desktop restart required
3. MCP servers initialize on startup
4. Tools become available in new conversations
5. Each server operates independently

## Related Documentation

### Previous Session Files
- `docs/PAM_WEBSOCKET_DIAGNOSTIC_JAN_11_2025.md` - WebSocket investigation
- `docs/TRANSLATION_STATUS_JAN_11_2025.md` - Translation progress
- `docs/SESSION_SUMMARY_JAN_11_2025.md` - Previous session summary

### SQL Fixes
- `FIX_ADMIN_RLS_FINAL.sql` - Admin RLS policies with JWT role check
- `docs/sql-fixes/test_content_moderation_access.sql` - Clean SQL for testing

### MCP Setup
- `SUPABASE_MCP_CREDENTIALS_GUIDE.md` - Credential setup guide

## Success Criteria

### MCP Activation ✅
- [x] 3 MCP servers configured
- [x] All credentials added
- [ ] Claude Desktop restarted
- [ ] MCP tools verified in new conversation

### Database Access ✅
- [x] Wheels & Wins MCP configured (kycoklimpzkyrecbjecn)
- [x] Unimog MCP configured (ydevatqwkoccxhtejdor)
- [x] Action Insight MCP configured (kciuuxoqxfsogjuqflou)
- [ ] All 3 databases accessible simultaneously

### Admin Access 🔄
- [x] RLS policies updated with JWT role check
- [ ] Admin content moderation 403 errors resolved
- [ ] Empty table vs permission issue clarified

---

**Session Date:** January 11, 2025
**Duration:** MCP setup and configuration
**Status:** Configuration complete, awaiting Claude Desktop restart
**Next Session:** Verify MCP activation and test database access
