-- Backfill-safe migration for older databases that were created
-- before image support was added to public.products.
alter table public.products
add column if not exists image_url text not null default '';
