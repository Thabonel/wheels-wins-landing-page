# Linear MCP Setup Guide - Claude Code Integration

**Your Linear Workspace:** https://linear.app/wheels-and-wins
**Project:** Wheels and Wins (f5d332fbf7ec)
**Date:** October 10, 2025

---

## 🎯 Quick Setup (5 Minutes)

### Step 1: Install Linear MCP Server

```bash
# Add Linear MCP to Claude Desktop config
claude mcp add --transport sse linear-server https://mcp.linear.app/sse
```

**Alternative (Manual Config):**

Edit `~/.config/claude-desktop/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/sse"]
    }
  }
}
```

### Step 2: Authenticate

1. Restart Claude Desktop
2. When prompted, authorize Linear access via OAuth
3. Grant permissions to your "Wheels and Wins" workspace

### Step 3: Verify Connection

In Claude Code, you should now be able to use Linear commands:
- "Show my Linear issues"
- "Create a Linear issue"
- "Update issue WHEEL-123"

---

## 📋 Import PAM Issues to Linear

### Method 1: Using Linear MCP (Automated)

Once MCP is configured, I can automatically create all 18 issues:

```
Me: "Create all 18 PAM issues from docs/LINEAR_PAM_ISSUES.md in the Wheels and Wins project"
```

### Method 2: Manual Import (CSV)

1. **Convert to CSV:**
   - I can generate a CSV file from the markdown
   - Format: Title, Description, Priority, Labels, Estimate, Project

2. **Import to Linear:**
   - Go to: https://linear.app/wheels-and-wins/settings/import
   - Select "CSV Import"
   - Upload the CSV file
   - Map columns
   - Import all issues

### Method 3: Manual Copy-Paste (Quick)

For immediate use (while MCP setup completes):

1. Open: https://linear.app/wheels-and-wins/project/wheels-and-wins-f5d332fbf7ec
2. Click "New Issue"
3. Copy from `docs/LINEAR_PAM_ISSUES.md`:
   - Issue title → Linear title
   - Description + Details → Linear description
   - Labels → Linear labels
   - Priority → Linear priority
   - Estimate → Linear estimate

---

## 🚀 What You Can Do After Setup

### Create Issues
```
"Create a Linear issue: Apply fuel consumption migration to production"
Priority: Critical
Labels: migration, database, pam
```

### View Issues
```
"Show all PAM-related issues in Linear"
"List critical issues in Wheels and Wins project"
```

### Update Issues
```
"Update issue WHEEL-123 status to In Progress"
"Add comment to issue WHEEL-456: Migration completed successfully"
```

### Search Issues
```
"Find Linear issues about fuel consumption"
"Show issues assigned to me"
```

---

## 🔧 Troubleshooting

### Authentication Issues
```bash
# Clear saved auth and re-authenticate
rm -rf ~/.mcp-auth
# Restart Claude Desktop
```

### MCP Not Working
```bash
# Check config file syntax
cat ~/.config/claude-desktop/claude_desktop_config.json | python -m json.tool

# Check if MCP process is running
ps aux | grep mcp-remote
```

### Connection Errors
- Ensure you have internet connection
- Verify Linear workspace permissions
- Check Linear API status: https://linear.app/status

---

## 📊 Current PAM Issues Ready for Import

**Total:** 18 issues
**File:** `docs/LINEAR_PAM_ISSUES.md`

**Critical (Do First - 3 issues):**
1. Apply Vehicle Fuel Consumption Migration (30 min)
2. End-to-End Testing - Fuel Consumption (1 hour)
3. Add Unit System Toggle in Settings (2 hours)

**High Priority (6 issues):**
4. Verify All 40 PAM Tools Work (3 hours)
5. Test Admin Knowledge System (1 hour)
6. Verify Claude Sonnet 4.5 Integration (30 min)
7-12. Various enhancements and features

**Medium/Low Priority (9 issues):**
13-18. Future enhancements and backlog items

---

## 🎯 Recommended Next Steps

### Option A: Setup Linear MCP (Best)
1. Run setup command above
2. Authenticate with Linear
3. Let me auto-create all 18 issues
4. Start working through them systematically

### Option B: Manual Import (Fastest)
1. Go to Linear project
2. Copy-paste Issues 1-3 (Critical) right now
3. Start working on them immediately
4. Import remaining issues later

### Option C: CSV Import (Middle Ground)
1. Let me generate a CSV from the markdown
2. Use Linear's CSV import feature
3. All 18 issues imported in one batch

---

## 📝 What I Need From You

**Choose one:**

**A) "Set up Linear MCP"**
→ I'll guide you through the setup process

**B) "Generate CSV for import"**
→ I'll create a Linear-compatible CSV file

**C) "Help me import manually"**
→ I'll walk you through copy-pasting the critical issues

**D) "Just apply the migration and test"**
→ We skip Linear setup for now and focus on the work

---

**Your Linear Workspace:** https://linear.app/wheels-and-wins
**Project URL:** https://linear.app/wheels-and-wins/project/wheels-and-wins-f5d332fbf7ec/overview
**Issues Ready:** 18 (documented in `docs/LINEAR_PAM_ISSUES.md`)

---

**What would you like to do?**
