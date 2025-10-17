# Legacy Conversation Files

**Archive Date:** January 16, 2025

## What This Is

This directory contains conversation logs from Claude Code sessions before we migrated to the Memory-Keeper MCP system.

## Migration to Memory-Keeper

As of January 16, 2025, all session context is now stored in the **Memory-Keeper MCP server** instead of markdown files.

**Why the change:**
- ✅ Searchable across all sessions
- ✅ Structured with categories and priorities
- ✅ Persistent across Claude Code restarts
- ✅ No file clutter in docs/
- ✅ Easier to query and retrieve context

## How to Access Historical Knowledge

Instead of reading these markdown files, use Memory-Keeper queries:

```typescript
// Search for specific topics
mcp__memory-keeper__context_search({ query: "calendar fix" });

// Get all high-priority items
mcp__memory-keeper__context_get({ priorities: ["high"] });

// Check session status
mcp__memory-keeper__context_status();
```

## Key Knowledge Already Migrated

The following knowledge from these files has been transferred to Memory-Keeper:

1. **Calendar Events 403 Fix** (Jan 15, 2025)
   - Key: `calendar-fix-jan-15-2025`
   - Category: progress
   - Includes all RLS fixes and tool updates

2. **Calendar Schema Reference** (Jan 15, 2025)
   - Key: `calendar-schema-reference`
   - Category: note
   - Database schema and frontend types

3. **Backend Fixes** (Jan 4, 2025)
   - Key: `backend-fixes-jan-4-2025`
   - Category: decision
   - Module structure and schema mismatches

4. **OpenAI GPT-5 Migration** (Sep 27, 2025)
   - Key: `openai-gpt5-migration-sep-2025`
   - Category: decision
   - Complete migration details

5. **Profiles Bigint Error** (Oct 14, 2025)
   - Key: `profiles-bigint-error-oct-14-2025`
   - Category: error
   - 9-month bug fix documentation

## These Files Are Kept For

- Historical reference only
- Backup in case Memory-Keeper data is lost
- Detailed conversation transcripts (Memory-Keeper stores summaries)

## Going Forward

**DO NOT create new conversation.md files** - Use Memory-Keeper instead!

See `CLAUDE.md` for the complete Memory-Keeper protocol.
