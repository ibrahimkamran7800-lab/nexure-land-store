-- NEXURE&LAND Customer Care messages
-- Run this in Supabase SQL Editor while signed in as project owner.
create table if not exists public.customer_care_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','admin')),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists customer_care_messages_customer_created_idx
  on public.customer_care_messages (customer_id, created_at);

alter table public.customer_care_messages enable row level security;

grant select, insert on public.customer_care_messages to authenticated;

drop policy if exists "Customers read their own care messages" on public.customer_care_messages;
create policy "Customers read their own care messages"
  on public.customer_care_messages for select to authenticated
  using (customer_id = auth.uid());

drop policy if exists "Admins read all care messages" on public.customer_care_messages;
create policy "Admins read all care messages"
  on public.customer_care_messages for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Customers send their own care messages" on public.customer_care_messages;
create policy "Customers send their own care messages"
  on public.customer_care_messages for insert to authenticated
  with check (customer_id = auth.uid() and sender_role = 'customer');

drop policy if exists "Admins reply to customer care messages" on public.customer_care_messages;
create policy "Admins reply to customer care messages"
  on public.customer_care_messages for insert to authenticated
  with check (sender_role = 'admin' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Enable instant message updates through Supabase Realtime when the standard
-- supabase_realtime publication is available in this project.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'customer_care_messages'
     ) then
    execute 'alter publication supabase_realtime add table public.customer_care_messages';
  end if;
end $$;
