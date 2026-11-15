-- NEXURE&LAND Website Image Manager setup
-- Run this whole script once in Supabase > SQL Editor > New query.

create table if not exists public.site_images (
  image_key text primary key,
  image_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_images enable row level security;

drop policy if exists "Public can read website images" on public.site_images;
create policy "Public can read website images"
  on public.site_images for select to anon, authenticated using (true);

drop policy if exists "Admins can manage website images" on public.site_images;
create policy "Admins can manage website images"
  on public.site_images for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view N&L site images" on storage.objects;
create policy "Public can view N&L site images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "Admins can upload N&L site images" on storage.objects;
create policy "Admins can upload N&L site images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins can update N&L site images" on storage.objects;
create policy "Admins can update N&L site images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (bucket_id = 'site-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins can delete N&L site images" on storage.objects;
create policy "Admins can delete N&L site images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
