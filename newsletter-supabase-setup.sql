-- NEXURE&LAND newsletter subscribers
-- Run this script once in Supabase Dashboard > SQL Editor.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Store normalized addresses consistently and reject obviously invalid values.
create or replace function public.normalize_newsletter_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  if new.email !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)+$' then
    raise exception 'Please provide a valid email address';
  end if;
  return new;
end;
$$;

drop trigger if exists newsletter_email_normalize on public.newsletter_subscribers;
create trigger newsletter_email_normalize
before insert or update of email on public.newsletter_subscribers
for each row execute function public.normalize_newsletter_email();

alter table public.newsletter_subscribers enable row level security;
drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (
  length(email) between 6 and 254
  and email = lower(trim(email))
);

-- No public SELECT, UPDATE, or DELETE policy is created.
-- View/manage subscriber addresses only from the trusted Supabase dashboard.
