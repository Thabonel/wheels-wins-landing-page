-- Security lint fix: Tighten overly permissive RLS INSERT policies.
-- Replaces WITH CHECK(true) policies with user-scoped checks where tables have user_id columns.
-- ocr_cache and tool_execution_log are service-only tables; scope them to service_role.

-- ============================================================================
-- ocr_cache: content-addressed cache (no user_id). Scope to service_role only.
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'ocr_cache') then
    drop policy if exists "service_role_full_access" on public.ocr_cache;
    drop policy if exists "ocr_cache_write_policy" on public.ocr_cache;
    drop policy if exists "ocr_cache_service_role" on public.ocr_cache;

    create policy "ocr_cache_service_role"
      on public.ocr_cache
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end;
$$;

-- ============================================================================
-- tool_execution_log: internal tool audit log. Scope ALL to service_role only.
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tool_execution_log') then
    drop policy if exists "service_role_full_access" on public.tool_execution_log;

    create policy "tool_execution_log_service_role"
      on public.tool_execution_log
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end;
$$;

-- ============================================================================
-- tip_usage_log: has contributor_id referencing auth.users. Scope INSERT to own user.
-- ============================================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tip_usage_log' and column_name = 'contributor_id'
  ) then
    drop policy if exists "tip_usage_log_user_insert" on public.tip_usage_log;

    create policy "tip_usage_log_user_insert"
      on public.tip_usage_log
      for insert
      to authenticated
      with check (auth.uid() = contributor_id);
  end if;
end;
$$;

-- ============================================================================
-- shakedown_issues: uses profile_id (maps to auth.uid()). Scope INSERT to owner.
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shakedown_issues') then
    drop policy if exists "shakedown_issues_authenticated_insert" on public.shakedown_issues;

    create policy "shakedown_issues_authenticated_insert"
      on public.shakedown_issues
      for insert
      to authenticated
      with check (auth.uid() = profile_id);
  end if;
end;
$$;

-- ============================================================================
-- shakedown_trips: uses profile_id (maps to auth.uid()). Scope INSERT to owner.
-- ============================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'shakedown_trips') then
    drop policy if exists "shakedown_trips_authenticated_write" on public.shakedown_trips;

    create policy "shakedown_trips_authenticated_write"
      on public.shakedown_trips
      for insert
      to authenticated
      with check (auth.uid() = profile_id);
  end if;
end;
$$;

-- ============================================================================
-- transition_equipment: dynamic fix — scope INSERT to user_id or profile_id.
-- ============================================================================
do $$
declare
  col text;
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'transition_equipment') then
    raise notice 'SKIPPED: transition_equipment table not found.';
    return;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transition_equipment' and column_name = 'user_id') then
    col := 'user_id';
  elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'transition_equipment' and column_name = 'profile_id') then
    col := 'profile_id';
  else
    raise notice 'SKIPPED: transition_equipment has no user_id or profile_id column.';
    return;
  end if;

  drop policy if exists "transition_equipment_authenticated_write" on public.transition_equipment;

  execute format('create policy "transition_equipment_authenticated_write" on public.transition_equipment for insert to authenticated with check (auth.uid() = %I)', col);
end;
$$;
