# 🗄️ Wheels & Wins – Pam 2.0 Schema Playbook

This playbook defines all **Supabase schema changes** required for Pam 2.0. Apply changes **only after completing the relevant build phase**. Keep migrations small, incremental, and documented.

---

## 📌 General Rules
1. Always test schema changes in **staging first**.
2. Keep existing schema intact; only **add** new tables/columns.
3. Apply changes via **SQL migration scripts**, checked into repo.
4. Use **Row Level Security (RLS)** from the start.
5. One feature = one migration file.

---

## 📌 Phase 2 – Conversational Engine
**Table: pam_messages**
```sql
CREATE TABLE IF NOT EXISTS pam_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  role TEXT CHECK (role IN ('user','pam')),
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pam_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own messages" ON pam_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON pam_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 📌 Phase 3 – Context Manager
**Table: pam_sessions**
```sql
CREATE TABLE IF NOT EXISTS pam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  context JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own sessions" ON pam_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON pam_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON pam_sessions
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 📌 Phase 4 – Passive Trip Logger (Wheels)
**Table: trips**
```sql
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start TIMESTAMPTZ,
  end TIMESTAMPTZ,
  route JSONB,
  stops JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 📌 Phase 5 – Savings Tracker (Wins)
**Table: pam_savings**
```sql
CREATE TABLE IF NOT EXISTS pam_savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_saved NUMERIC NOT NULL DEFAULT 0,
  free_month BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pam_savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own savings" ON pam_savings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings" ON pam_savings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own savings" ON pam_savings
  FOR UPDATE USING (auth.uid() = user_id);
```

## 📌 Phase 5.5 – Guardrails Configuration (Enhanced)
**Table: pam_guardrails_config**
```sql
-- Refined guardrails configuration (ENUM instead of JSON)
CREATE TYPE safety_level AS ENUM ('low', 'medium', 'high');
CREATE TABLE IF NOT EXISTS pam_guardrails_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  safety_level safety_level DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pam_guardrails_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own guardrails config" ON pam_guardrails_config
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own guardrails config" ON pam_guardrails_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own guardrails config" ON pam_guardrails_config
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 📌 Phase 6 – Safety Layer
**Table: safety_events**
```sql
CREATE TABLE IF NOT EXISTS safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own safety events" ON safety_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own safety events" ON safety_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 📌 Phase 7 – Testing Tables (Optional)
**Table: pam_test_data** (for staging only)
```sql
CREATE TABLE IF NOT EXISTS pam_test_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  test_name TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📌 Important Notes

### **Rate Limiting Strategy**
Rate limiting is **NOT stored in Postgres**. Use Redis for fast performance:
```python
# Redis-based rate limiting (100 messages/hour per user)
key = f"rate_limit:{user_id}"
current = await redis.get(key)
if current and int(current) >= 100:
    return False  # Rate limited
await redis.incr(key)
await redis.expire(key, 3600)  # 1 hour window
```

### **Real-time Subscriptions**
No tracking table needed. Supabase handles WebSocket subscriptions internally:
```javascript
// Frontend real-time setup
supabase
  .channel('calendar-changes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'calendar' },
    (payload) => setEvents(prev => [...prev, payload.new])
  )
  .subscribe();
```

### **MCP Server Configuration**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key"
      }
    }
  }
}
```

---

# ✅ End State
- Messages, sessions, trips, savings, safety events, and guardrails config tracked.
- All tables secure with RLS.
- Simple ENUM-based guardrails configuration.
- Redis-based rate limiting (no database overhead).
- Real-time subscriptions handled by Supabase (no tracking table).
- MCP server provides direct database access for PAM interactivity.
- Schema changes incremental, easy to extend.

