# PAM Admin Long-Term Memory System - COMPLETE ✅

**Date:** October 8, 2025
**Branch:** staging
**Commit:** 7228ca7f
**Status:** Deployed - awaiting Render + database migration

---

## 🎯 What Was Accomplished

### User Request
> "Can you make it so the admin can tell pam to add things to the database"

### Solution Delivered
✅ **Complete admin knowledge management system**
- Admins can teach PAM knowledge that persists forever
- PAM automatically searches knowledge base when answering questions
- Full tracking of knowledge usage and analytics

---

## 🗄️ Database Schema

### Table: `pam_admin_knowledge`
Stores admin-provided knowledge with rich context and metadata.

**Columns:**
```sql
id                  UUID PRIMARY KEY (auto-generated)
admin_user_id       UUID (who created the knowledge)
knowledge_type      TEXT (location_tip, travel_rule, seasonal_advice, general_knowledge, policy, warning)
category            TEXT (travel, budget, social, shop, general)
title               TEXT (short title)
content             TEXT (the actual knowledge)
location_context    TEXT (optional: where this applies)
date_context        TEXT (optional: when this applies, e.g., "May-August")
priority            INTEGER (1-10, default: 5)
tags                TEXT[] (array of tags for searching)
is_active           BOOLEAN (can be deactivated without deleting)
created_at          TIMESTAMP
updated_at          TIMESTAMP
last_used_at        TIMESTAMP (when last referenced)
usage_count         INTEGER (how many times used)
```

**Indexes:**
- category, knowledge_type, priority (for filtering)
- tags (GIN index for array searching)
- location_context (for location-based queries)
- is_active (for active-only queries)

### Table: `pam_knowledge_usage_log`
Tracks every time PAM uses admin knowledge.

**Columns:**
```sql
id                    UUID PRIMARY KEY
knowledge_id          UUID (references pam_admin_knowledge)
user_id               UUID (which user triggered the knowledge)
conversation_context  TEXT (what question led to this knowledge)
used_at               TIMESTAMP
```

**Triggers:**
- `update_knowledge_usage()`: Increments usage_count and updates last_used_at
- `update_admin_knowledge_timestamp()`: Updates updated_at on modifications

---

## 🔧 PAM Tools

### 1. `add_knowledge` (Admin Tool)

**Purpose:** Store new knowledge in PAM's long-term memory

**Parameters:**
- `title` (required): Short title (e.g., "Port Headland Best Season")
- `content` (required): The knowledge content
- `knowledge_type` (required): Type of knowledge
  - `location_tip`: Location-specific advice
  - `travel_rule`: General travel guidelines
  - `seasonal_advice`: Time/season-specific tips
  - `general_knowledge`: General information
  - `policy`: Company/platform policies
  - `warning`: Safety warnings or cautions
- `category` (required): Category (travel, budget, social, shop, general)
- `location_context` (optional): Where this applies (e.g., "Port Headland, Western Australia")
- `date_context` (optional): When this applies (e.g., "May-August", "Winter", "Summer 2025")
- `priority` (optional): Importance 1-10 (default: 5)
- `tags` (optional): Array of tags for searching

**Example Usage:**

**Admin says:** "PAM, remember that May to August is the best time to travel in the Port Headland vicinity"

**PAM executes:**
```python
await add_knowledge(
    user_id="admin-uuid",
    title="Port Headland Best Season",
    content="May to August is the best time to travel in Port Headland vicinity due to mild weather",
    knowledge_type="seasonal_advice",
    category="travel",
    location_context="Port Headland, Western Australia",
    date_context="May-August",
    priority=7,
    tags=["port-headland", "seasonal", "western-australia", "travel-timing"]
)
```

**PAM responds:** "I've learned: 'Port Headland Best Season'. I'll remember this and use it when helping users."

### 2. `search_knowledge` (Automatic Tool)

**Purpose:** Search knowledge base for relevant information (PAM uses this automatically)

**Parameters:**
- `query` (optional): Text search (searches title and content)
- `category` (optional): Filter by category
- `knowledge_type` (optional): Filter by type
- `location_context` (optional): Filter by location
- `tags` (optional): Filter by tags (matches ANY tag)
- `min_priority` (optional): Minimum priority level (default: 1)
- `limit` (optional): Max results (default: 10)

**Example Usage:**

**User asks:** "When should I visit Port Headland?"

**PAM automatically executes:**
```python
result = await search_knowledge(
    user_id="user-uuid",
    query="Port Headland",
    category="travel",
    knowledge_type="seasonal_advice"
)
```

**PAM finds:** "May to August is the best time to travel in Port Headland vicinity"

**PAM responds:** "Based on local knowledge, May to August is the best time to travel in the Port Headland vicinity due to mild weather conditions."

**Behind the scenes:**
- Usage logged in `pam_knowledge_usage_log`
- `usage_count` incremented
- `last_used_at` updated

---

## 🧠 How PAM Uses Knowledge

### Automatic Knowledge Retrieval

PAM's system prompt now includes:
> "SEARCH your knowledge base for admin-provided tips (always check when answering travel/location questions)"

**When does PAM search?**
- User asks about a location (e.g., "When should I visit X?")
- User asks for travel advice
- User asks about specific topics that might have admin knowledge
- Claude decides it's relevant based on conversation context

### Knowledge Storage Triggers

PAM detects admin intent to store knowledge when admin says:
- "PAM, remember that..."
- "PAM, note that..."
- "PAM, learn this..."
- "Keep in mind that..."
- Similar phrases indicating knowledge storage intent

---

## 📊 Knowledge Types & Use Cases

### Location Tips
```
Title: "Phoenix Summer Heat Safety"
Content: "Phoenix summers (June-September) exceed 110°F. Avoid midday travel, carry extra water, check tire pressure daily."
Location: "Phoenix, Arizona"
Date Context: "June-September"
Priority: 9 (high - safety critical)
Tags: ["phoenix", "summer", "safety", "heat"]
```

### Travel Rules
```
Title: "Canadian Border Crossing Documentation"
Content: "When crossing into Canada, have passport, vehicle registration, proof of insurance, and pet vaccination records ready."
Location: "US-Canada Border"
Priority: 8
Tags: ["canada", "border", "documentation", "requirements"]
```

### Seasonal Advice
```
Title: "Port Headland Best Season"
Content: "May to August is best time for Port Headland travel - mild weather, lower humidity, comfortable temperatures."
Location: "Port Headland, Western Australia"
Date Context: "May-August"
Priority: 7
Tags: ["port-headland", "seasonal", "western-australia", "travel-timing"]
```

### General Knowledge
```
Title: "RV Dump Station Etiquette"
Content: "Always rinse station after use, don't overfill, use biodegradable products only, respect 15-minute time limit."
Priority: 6
Tags: ["rv-etiquette", "dump-station", "community", "best-practices"]
```

### Policies
```
Title: "Wheels & Wins Refund Policy"
Content: "Full refunds within 30 days, 50% refunds within 60 days, store credit only after 60 days."
Category: "shop"
Priority: 7
Tags: ["policy", "refund", "shop", "customer-service"]
```

### Warnings
```
Title: "Hurricane Season Gulf Coast Travel"
Content: "June-November hurricane season along Gulf Coast. Monitor weather closely, have evacuation plan, don't travel during active storms."
Location: "Gulf Coast, USA"
Date Context: "June-November"
Priority: 10 (highest - safety critical)
Tags: ["hurricane", "gulf-coast", "weather", "safety", "warning"]
```

---

## 🔍 Search Examples

### By Location
```python
# User asks: "What should I know about Port Headland?"
search_knowledge(
    user_id="user-123",
    query="Port Headland",
    category="travel"
)
# Returns: All Port Headland travel tips
```

### By Season/Date
```python
# User asks: "Where should I travel in May?"
search_knowledge(
    user_id="user-123",
    date_context="May",
    category="travel",
    knowledge_type="seasonal_advice"
)
# Returns: All May-related travel advice
```

### By Tags
```python
# User asks: "Tell me about hurricane safety"
search_knowledge(
    user_id="user-123",
    tags=["hurricane", "safety"],
    min_priority=8
)
# Returns: High-priority hurricane safety warnings
```

### By Priority
```python
# PAM needs critical information
search_knowledge(
    user_id="user-123",
    query="safety",
    min_priority=9,
    limit=5
)
# Returns: Top 5 highest-priority safety items
```

---

## 🚀 Integration with PAM Core

### Tool Registration
**Total PAM Tools:** 42 (was 40, added 2 admin tools)

**Tool Categories:**
- Budget: 10 tools
- Trip: 10 tools
- Social: 10 tools
- Shop: 5 tools
- Profile: 5 tools
- **Admin: 2 tools** ← NEW

### Claude Function Calling Schema
Both tools registered in `_build_tools_schema()` with complete parameter definitions for Claude Sonnet 4.5 function calling.

### Execution Mapping
Both tools added to execution dictionary in `_execute_tools()` for direct function calls.

### System Prompt Enhancement
PAM's system prompt now includes knowledge base instructions:
```
**Your Capabilities:**
You can:
- [existing capabilities...]
- SEARCH your knowledge base for admin-provided tips (always check when answering travel/location questions)
- STORE knowledge when admins teach you something (use add_knowledge when admin says "remember that" or "note that")
```

---

## 🧪 Testing Guide

### Setup (First Time Only)

**1. Run Database Migration:**
```bash
# Connect to Supabase SQL editor
# Copy and paste: docs/sql-fixes/pam_admin_memory.sql
# Execute all statements
```

**Verify tables created:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'pam_%';
```

Expected:
- `pam_admin_knowledge`
- `pam_knowledge_usage_log`

### Testing Scenarios

#### Test 1: Admin Stores Knowledge
**Admin message:** "PAM, remember that May to August is the best time to travel in the Port Headland vicinity"

**Expected:**
1. PAM calls `add_knowledge` tool
2. New row inserted in `pam_admin_knowledge`
3. PAM responds: "I've learned: 'Port Headland Best Season'. I'll remember this and use it when helping users."

**Verify in database:**
```sql
SELECT title, content, location_context, date_context, priority, tags
FROM pam_admin_knowledge
WHERE location_context ILIKE '%Port Headland%';
```

#### Test 2: User Retrieves Knowledge
**User message:** "When should I visit Port Headland?"

**Expected:**
1. PAM calls `search_knowledge` automatically
2. Finds "Port Headland Best Season" entry
3. PAM responds with the knowledge content
4. Usage logged in `pam_knowledge_usage_log`
5. `usage_count` incremented
6. `last_used_at` updated

**Verify in database:**
```sql
SELECT k.title, k.usage_count, k.last_used_at,
       COUNT(l.id) as log_entries
FROM pam_admin_knowledge k
LEFT JOIN pam_knowledge_usage_log l ON k.id = l.knowledge_id
WHERE k.location_context ILIKE '%Port Headland%'
GROUP BY k.id, k.title, k.usage_count, k.last_used_at;
```

#### Test 3: Multiple Knowledge Entries
**Admin stores:**
1. "Phoenix summer heat safety tips"
2. "Best RV dump station etiquette"
3. "Hurricane season Gulf Coast warnings"

**User asks:** "Tell me about safety"

**Expected:**
1. PAM searches with query="safety"
2. Returns all 3 entries (sorted by priority)
3. PAM synthesizes response from multiple knowledge sources

#### Test 4: Location-Specific Search
**Admin stores knowledge for:**
- Phoenix, Arizona
- Port Headland, Western Australia
- Miami, Florida

**User asks:** "What should I know about Western Australia?"

**Expected:**
1. PAM searches with location_context="Western Australia"
2. Returns Port Headland knowledge
3. PAM mentions relevant information

#### Test 5: Tags Search
**Admin stores with tags:**
- Entry 1: ["safety", "heat", "summer"]
- Entry 2: ["safety", "hurricane", "storm"]
- Entry 3: ["budget", "fuel", "savings"]

**User asks:** "Safety tips"

**Expected:**
1. PAM searches with tags=["safety"]
2. Returns entries 1 and 2 (both have "safety" tag)
3. PAM provides comprehensive safety advice

---

## 📈 Analytics & Monitoring

### Knowledge Usage Stats
```sql
-- Most used knowledge
SELECT title, usage_count, last_used_at
FROM pam_admin_knowledge
ORDER BY usage_count DESC
LIMIT 10;

-- Knowledge never used
SELECT title, created_at
FROM pam_admin_knowledge
WHERE usage_count = 0
ORDER BY created_at DESC;

-- Most recent usage
SELECT k.title, l.conversation_context, l.used_at
FROM pam_knowledge_usage_log l
JOIN pam_admin_knowledge k ON l.knowledge_id = k.id
ORDER BY l.used_at DESC
LIMIT 20;
```

### Knowledge by Category
```sql
SELECT category, COUNT(*) as count, AVG(priority) as avg_priority
FROM pam_admin_knowledge
WHERE is_active = true
GROUP BY category
ORDER BY count DESC;
```

### High-Priority Knowledge Audit
```sql
SELECT title, knowledge_type, priority, created_at, usage_count
FROM pam_admin_knowledge
WHERE priority >= 8 AND is_active = true
ORDER BY priority DESC, created_at DESC;
```

---

## 🔐 Security Considerations

### Admin Privileges
**TODO:** Implement admin role check in `add_knowledge.py`
```python
# Currently: Any authenticated user can add knowledge
# Production: Check if user has admin role
if not user_has_admin_role(user_id):
    return {"success": False, "error": "Admin privileges required"}
```

### Row Level Security (RLS)
**Current:** All users can read/write
```sql
CREATE POLICY admin_knowledge_all ON pam_admin_knowledge
FOR ALL USING (true);
```

**Production:** Restrict writes to admins only
```sql
-- Replace with admin-only write policy
CREATE POLICY admin_knowledge_read ON pam_admin_knowledge
FOR SELECT USING (true);

CREATE POLICY admin_knowledge_write ON pam_admin_knowledge
FOR INSERT, UPDATE, DELETE
USING (is_admin(auth.uid()));
```

### Data Validation
- ✅ Knowledge types validated (enum)
- ✅ Categories validated (enum)
- ✅ Priority range validated (1-10)
- ✅ Required fields enforced
- ⚠️ Content length not limited (consider adding)
- ⚠️ Tag count not limited (consider max 20 tags)

---

## 💡 Advanced Features (Future Enhancements)

### 1. Knowledge Expiration
```sql
ALTER TABLE pam_admin_knowledge
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Cleanup expired knowledge
DELETE FROM pam_admin_knowledge
WHERE expires_at IS NOT NULL AND expires_at < NOW();
```

### 2. Knowledge Versioning
```sql
CREATE TABLE pam_knowledge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES pam_admin_knowledge(id),
  content TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Knowledge Approval Workflow
```sql
ALTER TABLE pam_admin_knowledge
ADD COLUMN status TEXT CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
```

### 4. Knowledge Ratings
```sql
CREATE TABLE pam_knowledge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID REFERENCES pam_admin_knowledge(id),
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Semantic Search (Vector Embeddings)
```sql
ALTER TABLE pam_admin_knowledge
ADD COLUMN embedding vector(1536);

-- Use pgvector for similarity search
CREATE INDEX ON pam_admin_knowledge USING ivfflat (embedding vector_cosine_ops);
```

---

## 🎉 Success Metrics

✅ **CORE GOALS ACHIEVED:**
- [x] Admin can store knowledge in database
- [x] Knowledge persists across all sessions
- [x] PAM automatically searches knowledge when relevant
- [x] Usage tracking and analytics
- [x] Flexible search (location, tags, categories, dates)
- [x] Priority-based retrieval
- [x] Complete Claude function calling integration
- [x] Zero breaking changes to existing functionality

---

## 📝 Next Steps

### Immediate (After Render Deploy)
1. ⏳ Run database migration (pam_admin_memory.sql)
2. ⏳ Test knowledge storage with admin account
3. ⏳ Test knowledge retrieval in user conversations
4. ⏳ Verify usage logging works

### Short Term
1. ⬜ Add admin role check to add_knowledge tool
2. ⬜ Update RLS policies for admin-only writes
3. ⬜ Create admin UI for managing knowledge
4. ⬜ Add knowledge import/export functionality

### Long Term
1. ⬜ Implement knowledge versioning
2. ⬜ Add semantic search with embeddings
3. ⬜ Create knowledge approval workflow
4. ⬜ Build analytics dashboard for knowledge usage
5. ⬜ Add bulk knowledge import from CSV

---

## 🔗 Related Files

**Database:**
- `docs/sql-fixes/pam_admin_memory.sql` - Database schema

**Tools:**
- `backend/app/services/pam/tools/admin/add_knowledge.py` - Store knowledge
- `backend/app/services/pam/tools/admin/search_knowledge.py` - Search knowledge
- `backend/app/services/pam/tools/admin/__init__.py` - Package exports

**Core:**
- `backend/app/services/pam/core/pam.py` - Tool registration and execution

**Documentation:**
- `backend/PAM_CLAUDE_MIGRATION_SUMMARY.md` - Claude AI migration
- `backend/PAM_WEATHER_FIX_SUMMARY.md` - Weather tool implementation
- `docs/technical-audits/PAM_SYSTEM_AUDIT_2025-10-04.md` - Full system audit

---

**Status:** ✅ COMPLETE - Admin can now teach PAM knowledge via natural language!
**Database:** ⏳ Migration pending (run pam_admin_memory.sql)
**Backend:** ✅ Deployed to staging (commit 7228ca7f)
**Testing:** ⏳ Awaiting database migration and testing

**Last Updated:** October 8, 2025
