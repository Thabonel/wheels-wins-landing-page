-- Security lint fix: Enable RLS on spatial_ref_sys (block API access).
-- spatial_ref_sys is a PostGIS system metadata table. No frontend queries it.
-- Enabling RLS with no policies = default deny. PostGIS functions still work
-- because they run as their definer (extension owner / superuser).
-- Must be applied via supabase db push (superuser required).

do $$
begin
  if exists (
    select 1 from pg_roles
    where rolname = current_user and rolsuper
  ) then
    alter table public.spatial_ref_sys enable row level security;

    raise notice 'spatial_ref_sys RLS enabled (no policies = api access blocked).';
  else
    raise notice 'SKIPPED: spatial_ref_sys RLS requires superuser. Run via supabase db push.';
  end if;
end;
$$;
