-- Admin AI Registry: Database-backed AI configuration for the Admin AI Control Center.
-- Enables runtime-adjustable provider, model slot, and task route configuration.
-- Seeds defaults matching the current hardcoded config from backend/app/config/ai_providers.py.

-- ============================================================================
-- ai_providers: Provider identity and operational settings
-- ============================================================================
create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  family text not null check (family in ('anthropic', 'openai', 'deepseek', 'gemini')),
  display_name text not null,
  enabled boolean not null default true,
  base_url text,
  data_region text,
  secret_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ai_models: Slot-level model metadata and capabilities
-- ============================================================================
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null unique,
  display_name text not null,
  provider_key text not null references public.ai_providers(provider_key) on delete cascade,
  model_id text not null,
  secret_ref text not null,
  enabled boolean not null default true,
  capabilities jsonb not null default '["text"]',
  context_window integer not null default 8192,
  input_cost_per_1m numeric(10,4) not null default 0,
  output_cost_per_1m numeric(10,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ai_task_routes: Task-to-slot routing configuration
-- ============================================================================
create table if not exists public.ai_task_routes (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique,
  display_name text not null,
  primary_slot text not null references public.ai_models(slot_key) on delete restrict,
  fallback_slots jsonb not null default '[]',
  required_capabilities jsonb not null default '["text"]',
  output_format text not null default 'text',
  max_tokens integer not null default 4096,
  temperature numeric(3,2) not null default 0.7,
  enabled boolean not null default true,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ai_usage_events: Request telemetry for cost/budget tracking
-- ============================================================================
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text,
  model_slot text,
  task_key text,
  user_id uuid references auth.users(id) on delete set null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  latency_ms integer not null default 0,
  cost_estimate numeric(10,6) not null default 0,
  fallback_used boolean not null default false,
  trace_id text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ai_budget_settings: Monthly budget controls
-- ============================================================================
create table if not exists public.ai_budget_settings (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_cap numeric(10,2) not null default 100.00,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ai_admin_audit_log: Track admin configuration changes
-- ============================================================================
create table if not exists public.ai_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_key text not null,
  old_values jsonb,
  new_values jsonb,
  change_note text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- RLS: Service role writes, authenticated reads (admin-only enforced in API)
-- ============================================================================
alter table public.ai_providers enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_task_routes enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_budget_settings enable row level security;
alter table public.ai_admin_audit_log enable row level security;

-- Service role full access
create policy "service_role_full_access" on public.ai_providers for all to service_role using (true) with check (true);
create policy "service_role_full_access" on public.ai_models for all to service_role using (true) with check (true);
create policy "service_role_full_access" on public.ai_task_routes for all to service_role using (true) with check (true);
create policy "service_role_full_access" on public.ai_usage_events for all to service_role using (true) with check (true);
create policy "service_role_full_access" on public.ai_budget_settings for all to service_role using (true) with check (true);
create policy "service_role_full_access" on public.ai_admin_audit_log for all to service_role using (true) with check (true);

-- Authenticated users can read config (admin write gated in API)
create policy "authenticated_read_providers" on public.ai_providers for select to authenticated using (true);
create policy "authenticated_read_models" on public.ai_models for select to authenticated using (true);
create policy "authenticated_read_routes" on public.ai_task_routes for select to authenticated using (true);
create policy "authenticated_read_budget" on public.ai_budget_settings for select to authenticated using (true);

-- Usage events: users can read their own
create policy "users_read_own_usage" on public.ai_usage_events for select to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- Seed data matching current hardcoded config from ai_providers.py
-- ============================================================================

-- Providers
insert into public.ai_providers (provider_key, family, display_name, enabled, secret_ref) values
  ('anthropic', 'anthropic', 'Anthropic Claude', true, 'ANTHROPIC_API_KEY'),
  ('openai', 'openai', 'OpenAI GPT', true, 'OPENAI_API_KEY'),
  ('deepseek', 'deepseek', 'DeepSeek', true, 'DEEPSEEK_API_KEY'),
  ('gemini', 'gemini', 'Google Gemini', false, 'GEMINI_API_KEY')
on conflict (provider_key) do nothing;

-- Model slots
insert into public.ai_models (slot_key, display_name, provider_key, model_id, secret_ref, enabled, capabilities, context_window, input_cost_per_1m, output_cost_per_1m) values
  ('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'anthropic', 'claude-sonnet-4-5-20250929', 'ANTHROPIC_API_KEY', true, '["text","json","vision","pdf","tools","long_context"]', 200000, 3.00, 15.00),
  ('claude-haiku-4-5', 'Claude Haiku 4.5', 'anthropic', 'claude-3-5-haiku-20241022', 'ANTHROPIC_API_KEY', false, '["text","json","vision","tools"]', 200000, 1.00, 5.00),
  ('gpt-5-1-instant', 'GPT-5.1 Instant', 'openai', 'gpt-5.1-instant', 'OPENAI_API_KEY', true, '["text","json","vision","tools","long_context"]', 128000, 1.25, 10.00),
  ('gpt-5-1-thinking', 'GPT-5.1 Thinking', 'openai', 'gpt-5.1-thinking', 'OPENAI_API_KEY', false, '["text","json","tools","long_context"]', 128000, 2.50, 20.00),
  ('deepseek-v3', 'DeepSeek V3', 'deepseek', 'deepseek-chat', 'DEEPSEEK_API_KEY', true, '["text","json","tools","long_context"]', 64000, 0.27, 1.10),
  ('gemini-pro', 'Gemini Pro', 'gemini', 'gemini-3.1-pro-preview', 'GEMINI_API_KEY', false, '["text","json","vision","tools","long_context"]', 128000, 1.25, 10.00)
on conflict (slot_key) do nothing;

-- Task routes
insert into public.ai_task_routes (task_key, display_name, primary_slot, fallback_slots, required_capabilities, output_format, max_tokens, temperature, enabled, risk_level) values
  ('pam_conversation', 'PAM Conversation', 'claude-sonnet-4-5', '["gpt-5-1-instant","deepseek-v3"]', '["text","json","tools","long_context"]', 'json', 4096, 0.7, true, 'medium'),
  ('content_moderation', 'Content Moderation', 'claude-sonnet-4-5', '["gpt-5-1-instant"]', '["text","json","tools"]', 'json', 2048, 0.3, true, 'high'),
  ('trip_generation', 'Trip Generation', 'claude-sonnet-4-5', '["gpt-5-1-instant","deepseek-v3"]', '["text","json","tools"]', 'json', 8192, 0.7, true, 'low'),
  ('quick_answer', 'Quick Answer', 'gpt-5-1-instant', '["deepseek-v3"]', '["text","json"]', 'text', 2048, 0.5, true, 'low'),
  ('trip_analysis', 'Trip Analysis', 'claude-sonnet-4-5', '["gpt-5-1-instant"]', '["text","json","tools"]', 'json', 4096, 0.5, true, 'medium'),
  ('document_extraction', 'Document Extraction', 'gpt-5-1-instant', '["claude-sonnet-4-5"]', '["text","json","pdf"]', 'json', 8192, 0.3, true, 'low'),
  ('embeddings', 'Embeddings', 'gpt-5-1-instant', '["deepseek-v3"]', '["text"]', 'json', 8192, 0.7, true, 'low'),
  ('admin_test', 'Admin Test Prompt', 'gpt-5-1-instant', '["deepseek-v3"]', '["text","json"]', 'text', 1024, 0.7, true, 'low')
on conflict (task_key) do nothing;

-- Budget settings
insert into public.ai_budget_settings (monthly_budget_cap, is_active) values (500.00, false)
on conflict do nothing;

-- Indexes for query performance
create index if not exists idx_ai_providers_enabled on public.ai_providers(enabled);
create index if not exists idx_ai_models_enabled on public.ai_models(enabled);
create index if not exists idx_ai_models_provider on public.ai_models(provider_key);
create index if not exists idx_ai_routes_enabled on public.ai_task_routes(enabled);
create index if not exists idx_ai_usage_user_id on public.ai_usage_events(user_id);
create index if not exists idx_ai_usage_created on public.ai_usage_events(created_at);
create index if not exists idx_ai_audit_created on public.ai_admin_audit_log(created_at);
create index if not exists idx_ai_audit_admin on public.ai_admin_audit_log(admin_user_id);
create index if not exists idx_ai_audit_entity on public.ai_admin_audit_log(entity_type, entity_key);
