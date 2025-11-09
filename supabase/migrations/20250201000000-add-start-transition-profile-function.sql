-- Migration: add start_transition_profile RPC helper
-- Purpose: allow authenticated users to create or enable their transition profile without RLS violations
-- Adds a SECURITY DEFINER function that wraps the transition_profiles upsert logic using auth.uid()

create or replace function public.start_transition_profile(
    p_departure_date date default null,
    p_is_enabled boolean default true
) returns public.transition_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
    v_departure_date date := coalesce(p_departure_date, (now() at time zone 'utc')::date + 90);
    v_profile public.transition_profiles;
begin
    if v_user_id is null then
        raise exception 'start_transition_profile requires an authenticated user'
            using errcode = 'P0001';
    end if;

    insert into public.transition_profiles as tp (
        user_id,
        departure_date,
        is_enabled,
        updated_at
    )
    values (
        v_user_id,
        v_departure_date,
        coalesce(p_is_enabled, true),
        now()
    )
    on conflict (user_id) do update
        set departure_date = excluded.departure_date,
            is_enabled = excluded.is_enabled,
            updated_at = now()
    returning tp.* into v_profile;

    return v_profile;
end;
$$;

revoke all on function public.start_transition_profile(date, boolean) from public;
-- Ensure logged-in users can execute the helper while anonymous users cannot
grant execute on function public.start_transition_profile(date, boolean) to authenticated;
-- Allow backend service role to call the helper for automation tasks
grant execute on function public.start_transition_profile(date, boolean) to service_role;
