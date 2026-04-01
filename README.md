# Marin

Next.js + Tailwind + shadcn-style UI + Supabase MVP for Amazon sellers who want a decision-support dashboard for ungating attempts.

## What this app does

- Daily-updated recommendation dashboard for ungating candidates
- Supports both auto-ungate and 10-unit paths
- Shows confidence, risk, supplier context, invoice notes, and last-updated timestamps
- Includes watchlist, updates feed, settings, and admin panel UI
- Explicitly **does not** guarantee ungating approval

## Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn-style UI components in `src/components/ui`
- Supabase for auth/data integration
- Vercel-ready cron for daily refresh endpoint

## Routes

Public:

- `/` landing
- `/login`
- `/signup`
- `/faq`

App:

- `/dashboard`
- `/recommendations`
- `/recommendations/[id]`
- `/saved`
- `/updates`
- `/settings`
- `/admin`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env.local
```

3. Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `AMAZON_PAAPI_ACCESS_KEY`
- `AMAZON_PAAPI_SECRET_KEY`
- `AMAZON_PAAPI_PARTNER_TAG`
- Optional PA-API overrides:
  - `AMAZON_PAAPI_MARKETPLACE` (default: `www.amazon.com`)
  - `AMAZON_PAAPI_HOST` (default: `webservices.amazon.com`)
  - `AMAZON_PAAPI_REGION` (default: `us-east-1`)

4. Run dev server:

```bash
npm run dev
```

## Supabase setup

1. Open Supabase SQL editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql).
3. Optionally add your own seed product rows to `products` and `product_updates`.
4. Add an `image_url` column if your database was created before image support:

```sql
alter table public.products
add column if not exists image_url text not null default '';
```

If env keys are missing, the app automatically falls back to local mock data so the UI still works.

## Daily updates logic

- API endpoint: `/api/daily-refresh`
- Cron schedule in [`vercel.json`](./vercel.json): daily at `06:00` UTC
- Protect with `CRON_SECRET` via `x-cron-secret` header

## Amazon image sync

- Admins can open `/admin` and use **Sync Amazon images**.
- The action calls `/api/admin/sync-product-images` and requires:
  - valid Supabase login session with user metadata role `admin`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Amazon PA-API credentials listed above
- The sync updates `products.image_url` by ASIN in batches.
- If your user is not recognized as admin, set `auth.users.raw_user_meta_data.role` to `admin`.

### Admin role metadata SQL

Run this in Supabase SQL editor (or via migrations), replacing the email if needed:

```sql
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
    updated_at = now()
where lower(email) = lower('admin@marin.local');
```

Verify:

```sql
select email, raw_user_meta_data->>'role' as role
from auth.users
where lower(email) = lower('admin@marin.local');
```

## Important domain note

Ungating is not guaranteed. This platform is built as a recommendation and decision-support system only.
