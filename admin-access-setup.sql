-- NEXURE&LAND: secure Admin Access management
-- Run this once in Supabase SQL Editor while signed in as the project owner.
-- This function only lets an already-authorised profiles.role='admin' user
-- promote/demote an EXISTING profile. It cannot create Auth users.

create or replace function public.admin_set_profile_role(p_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if p_role is null or p_role not in ('admin', 'customer') then
    raise exception 'Invalid access role.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role here.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only an existing authorised admin can change account roles.';
  end if;

  update public.profiles
     set role = p_role
   where id = p_user_id;

  if not found then
    raise exception 'The selected registered profile was not found.';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_set_profile_role(uuid, text) from public;
revoke all on function public.admin_set_profile_role(uuid, text) from anon;
grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;

-- Important: keep profiles SELECT restricted to authorised admins as already configured.
-- Do not add a public INSERT/UPDATE policy that lets customers edit their own role.
