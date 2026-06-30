-- Security lint fix: Revoke anon and authenticated EXECUTE on SECURITY DEFINER admin functions.
-- These functions should only be callable by service_role (via the backend API).
-- Function signatures include parameter types because Postgres allows overloaded function names.

-- Admin/lookup functions — should never be callable by anon or authenticated.
do $$
declare
  func text;
  funcs text[] := array[
    'admin_get_flagged_content()',
    'admin_get_users()',
    'debug_auth_state()',
    'test_jwt_admin_role_fix()',
    'validate_jwt_admin_fix_final()',
    'validate_jwt_admin_fix_type_safe()',
    'some_function()',
    'get_user_id_from_auth()',
    'verify_rls_policies()',
    'verify_security_definer_functions()'
  ];
begin
  foreach func in array funcs loop
    execute 'revoke execute on function public.' || func || ' from public, anon, authenticated';
  end loop;
end;
$$;

-- Maintenance/cleanup functions — should only run via cron/service_role.
do $$
declare
  func text;
  funcs text[] := array[
    'cleanup_expired_pam_memory()',
    'cleanup_expired_sessions()',
    'process_rl_events()',
    'generate_training_dataset(text, text, numeric)'
  ];
begin
  foreach func in array funcs loop
    if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid where n.nspname = 'public' and p.proname = split_part(func, '(', 1)) then
      execute 'revoke execute on function public.' || func || ' from public, anon, authenticated';
    end if;
  end loop;
end;
$$;

-- Grant service_role access to these functions so the backend still works.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.admin_get_flagged_content() to service_role;
    grant execute on function public.admin_get_users() to service_role;
    grant execute on function public.cleanup_expired_pam_memory() to service_role;
    grant execute on function public.cleanup_expired_sessions() to service_role;
    grant execute on function public.process_rl_events() to service_role;
  end if;
end;
$$;
