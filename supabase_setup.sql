-- Run this script in Supabase Dashboard > SQL Editor.
-- Secure-by-default setup for a static GitHub Pages site.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'خاطره 🤍',
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.gallery_photos enable row level security;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

drop policy if exists "Admins can read admin list" on public.admin_users;
create policy "Admins can read admin list" on public.admin_users
for select to authenticated using (public.is_site_admin());

drop policy if exists "Anyone can read site content" on public.site_content;
create policy "Anyone can read site content" on public.site_content
for select to anon, authenticated using (true);
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content" on public.site_content
for insert to authenticated with check (public.is_site_admin());
drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content
for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "Admins can delete site content" on public.site_content;
create policy "Admins can delete site content" on public.site_content
for delete to authenticated using (public.is_site_admin());

drop policy if exists "Anyone can read gallery metadata" on public.gallery_photos;
create policy "Anyone can read gallery metadata" on public.gallery_photos
for select to anon, authenticated using (true);
drop policy if exists "Admins can insert gallery metadata" on public.gallery_photos;
create policy "Admins can insert gallery metadata" on public.gallery_photos
for insert to authenticated with check (public.is_site_admin());
drop policy if exists "Admins can update gallery metadata" on public.gallery_photos;
create policy "Admins can update gallery metadata" on public.gallery_photos
for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists "Admins can delete gallery metadata" on public.gallery_photos;
create policy "Admins can delete gallery metadata" on public.gallery_photos
for delete to authenticated using (public.is_site_admin());


-- Explicit table grants; RLS policies above still decide which rows/actions are allowed.
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant select on public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.gallery_photos to authenticated;
grant select on public.admin_users to authenticated;

-- Public image delivery; writes/deletes are restricted to allowlisted admin accounts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 12582912, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 12582912,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif'];

drop policy if exists "Anyone can view gallery files" on storage.objects;
create policy "Anyone can view gallery files" on storage.objects
for select to anon, authenticated using (bucket_id = 'gallery');

drop policy if exists "Admins can upload gallery files" on storage.objects;
create policy "Admins can upload gallery files" on storage.objects
for insert to authenticated with check (bucket_id = 'gallery' and public.is_site_admin());

drop policy if exists "Admins can update gallery files" on storage.objects;
create policy "Admins can update gallery files" on storage.objects
for update to authenticated using (bucket_id = 'gallery' and public.is_site_admin())
with check (bucket_id = 'gallery' and public.is_site_admin());

drop policy if exists "Admins can delete gallery files" on storage.objects;
create policy "Admins can delete gallery files" on storage.objects
for delete to authenticated using (bucket_id = 'gallery' and public.is_site_admin());

-- Add your admin user only AFTER creating the user in Authentication > Users.
-- Replace the UUID with that user's ID, then run this separately:
-- insert into public.admin_users (user_id) values ('PASTE-AUTH-USER-UUID-HERE');
