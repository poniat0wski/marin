-- Ensure the primary admin account has user metadata role=admin.
-- This is idempotent and safe to re-run.
--
-- If your admin email is different, duplicate this statement with your email
-- or run the equivalent query in Supabase SQL editor.
update auth.users
set
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  updated_at = now()
where lower(email) = lower('admin@marin.local');

-- Optional verification:
-- select email, raw_user_meta_data->>'role' as role
-- from auth.users
-- where lower(email) = lower('admin@marin.local');
