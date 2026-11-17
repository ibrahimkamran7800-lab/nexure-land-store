-- NEXURE&LAND Product Reviews
-- Run once in Supabase SQL Editor as the project owner.
-- A customer can review only a product included in their own DELIVERED order.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null default 'Customer',
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_created_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;
grant select on public.product_reviews to anon, authenticated;
grant insert, update on public.product_reviews to authenticated;

 drop policy if exists "Anyone can read product reviews" on public.product_reviews;
create policy "Anyone can read product reviews"
  on public.product_reviews for select
  using (true);

drop policy if exists "Delivered customers can review purchased products" on public.product_reviews;
create policy "Delivered customers can review purchased products"
  on public.product_reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and lower(o.status) = 'delivered'
        and oi.product_id = product_reviews.product_id
    )
  );

drop policy if exists "Customers can update their own delivered-product review" on public.product_reviews;
create policy "Customers can update their own delivered-product review"
  on public.product_reviews for update to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and lower(o.status) = 'delivered'
        and oi.product_id = product_reviews.product_id
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and lower(o.status) = 'delivered'
        and oi.product_id = product_reviews.product_id
    )
  );
