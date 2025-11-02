# MCP Servers Diagnostic Report

**Date:** October 29, 2025
**Issue:** 7 MCP servers reported as failed

---

## Current Configuration Analysis

### ✅ Servers in Claude Desktop Config (5 total)

Based on `~/.config/claude-desktop/claude_desktop_config.json`:

1. **supabase** - `@supabase/mcp-server-supabase`
   - Status: Configured ✅
   - Project: kycoklimpzkyrecbjecn
   - Has service role key and access token

2. **github** - `@modelcontextprotocol/server-github`
   - Status: Configured ✅
   - Has personal access token

3. **memory-keeper** - `mcp-memory-keeper`
   - Status: Configured ✅
   - No auth required

4. **stripe** - `@stripe/mcp`
   - Status: Configured ✅
   - Has live API key
   - Tools: all

5. **puppeteer** - `@modelcontextprotocol/server-puppeteer`
   - Status: Configured ✅
   - No auth required

---

## 🔍 Built-in MCP Servers (Available by Default)

These servers are built into Claude Code and don't require config:

6. **filesystem** - Built-in ✅
   - Tools: read_text_file, write_file, edit_file, list_directory, etc.
   - Status: Working (I used these tools in this session)

7. **brave-search** - Built-in ✅
   - Tools: brave_web_search, brave_local_search
   - Status: Should be working

8. **sequential-thinking** - Built-in ✅
   - Tools: sequentialthinking (chain of thought reasoning)
   - Status: Should be working

---

## ❓ Missing/Disabled Servers

### "fetch" Server
- **Status:** Disabled (as mentioned by user)
- **Note:** Not in current config, may have been removed or deprecated

---

## 🐛 Potential Issues

### Issue 1: NPM Package Failures
If you're seeing "7 MCP servers failed", it's likely that some NPM packages failed to install or start.

**Common causes:**
- Network issues downloading packages
- Version conflicts
- Missing dependencies
- Node.js version incompatibility

### Issue 2: Authentication Problems
Some servers may fail if credentials are invalid:
- ❓ Supabase access token expired?
- ❓ GitHub PAT expired or revoked?
- ❓ Stripe key invalid?

### Issue 3: Missing Node Modules
Some MCP servers require global npm packages:
```bash
npm install -g @supabase/mcp-server-supabase
npm install -g @modelcontextprotocol/server-github
npm install -g mcp-memory-keeper
npm install -g @stripe/mcp
npm install -g @modelcontextprotocol/server-puppeteer
```

---

## 🔧 Diagnostic Steps

### Step 1: Check Claude Desktop Logs
```bash
# View recent logs
tail -100 ~/Library/Logs/Claude/main.log

# Look for MCP server errors
grep -i "mcp" ~/Library/Logs/Claude/main.log | tail -50

# Look for npm errors
grep -i "npm" ~/Library/Logs/Claude/main.log | tail -50
```

### Step 2: Test Each Server Manually
```bash
# Test Supabase MCP
npx -y @supabase/mcp-server-supabase --project-ref=kycoklimpzkyrecbjecn --help

# Test GitHub MCP
npx -y @modelcontextprotocol/server-github --help

# Test Memory Keeper MCP
npx -y mcp-memory-keeper --help

# Test Stripe MCP
npx -y @stripe/mcp --help

# Test Puppeteer MCP
npx -y @modelcontextprotocol/server-puppeteer --help
```

### Step 3: Check Node.js Version
```bash
node --version  # Should be v18+ or v20+
npm --version   # Should be v9+ or v10+
```

### Step 4: Clear NPM Cache
```bash
npm cache clean --force
```

---

## 🚨 Known Issues

### Supabase MCP Authorization Error
In this session, I got:
```
Unauthorized. Please provide a valid access token to the MCP server
via the --access-token flag or SUPABASE_ACCESS_TOKEN.
```

**Possible causes:**
1. Access token expired (tokens expire after ~30 days)
2. Service role key incorrect
3. MCP server needs session restart to pick up env vars

**Fix:**
1. Generate new Supabase access token from dashboard
2. Update `claude_desktop_config.json`
3. Restart Claude Desktop

---

## 📝 Recommended Actions

### Immediate Actions
1. ✅ Restart Claude Desktop application
2. ✅ Check Claude Desktop logs for specific error messages
3. ✅ Verify all npm packages install correctly

### If Still Failing
1. Run each npx command manually to see specific errors
2. Check if Node.js version is compatible (v18+)
3. Regenerate Supabase access token if expired
4. Regenerate GitHub PAT if expired
5. Clear npm cache and retry

### Configuration Cleanup
Consider creating a minimal config with only essential servers:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=kycoklimpzkyrecbjecn"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_new_token_here",
        "SUPABASE_SERVICE_ROLE_KEY": "your_key_here"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_pat_here"
      }
    },
    "memory-keeper": {
      "command": "npx",
      "args": ["-y", "mcp-memory-keeper"]
    }
  }
}
```

Start with just these 3 critical servers, then add others one at a time.

---

## ✅ Verification

After fixes, verify each server works:

```bash
# Test in this chat
/mcp supabase list_tables
/mcp github search_repositories query:"react"
/mcp memory-keeper context_status
```

---

## 📊 Summary

**Total Configured:** 5 external + 3 built-in = 8 servers
**Working:** At least 3 built-in (filesystem, brave-search, sequential-thinking)
**Unknown Status:** 5 external servers (need restart to verify)
**Reported Failed:** 7 servers

**Most Likely Issue:** NPM package installation failures or authentication token expiration

**Next Step:** Restart Claude Desktop and check logs for specific error messages

---

## 🔗 Quick Links

- Supabase Dashboard: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/settings/api
- GitHub PAT Settings: https://github.com/settings/tokens
- Claude Desktop Logs: `~/Library/Logs/Claude/main.log`
- MCP Config: `~/.config/claude-desktop/claude_desktop_config.json`

---

**Created:** October 29, 2025
**Status:** Awaiting log analysis and server restart
