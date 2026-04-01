-- Run in Supabase SQL editor

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marketplace text not null default 'US',
  categories text[] not null default '{}',
  brands text[] not null default '{}',
  experience_level text not null default 'new',
  budget_min numeric not null default 0,
  budget_max numeric not null default 500,
  preferred_ungating_type text not null default 'both',
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  asin text not null,
  image_url text not null default '',
  brand text not null,
  category text not null,
  supplier text not null,
  supplier_url text not null default '',
  ungating_type text not null check (ungating_type in ('auto', 'ten_unit')),
  estimated_quantity int not null,
  price_estimate numeric not null,
  confidence_level text not null check (confidence_level in ('low', 'medium', 'high')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  invoice_notes text not null,
  supplier_notes text not null,
  recommendation_reason text not null,
  notes text not null,
  update_type text not null check (update_type in ('new', 'updated', 'removed')),
  active boolean not null default true,
  last_updated timestamptz not null default now(),
  last_validation timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_saved_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.product_updates (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  type text not null check (type in ('new', 'updated', 'removed')),
  summary text not null,
  previous_confidence text,
  new_confidence text,
  happened_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
alter table public.user_saved_products enable row level security;
alter table public.products enable row level security;
alter table public.product_updates enable row level security;

-- Authenticated users can read recommendations and updates.
create policy "read products" on public.products
for select to authenticated using (true);

create policy "read product updates" on public.product_updates
for select to authenticated using (true);

-- Users can manage their own preferences and watchlist.
create policy "user prefs select" on public.user_preferences
for select to authenticated using (auth.uid() = user_id);

create policy "user prefs upsert" on public.user_preferences
for insert to authenticated with check (auth.uid() = user_id);

create policy "user prefs update" on public.user_preferences
for update to authenticated using (auth.uid() = user_id);

create policy "watchlist select" on public.user_saved_products
for select to authenticated using (auth.uid() = user_id);

create policy "watchlist insert" on public.user_saved_products
for insert to authenticated with check (auth.uid() = user_id);

create policy "watchlist delete" on public.user_saved_products
for delete to authenticated using (auth.uid() = user_id);
