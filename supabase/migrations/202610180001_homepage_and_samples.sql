-- ==============================================================================
-- 202610180001_homepage_and_samples.sql
-- Phase 2: Homepage photo management and public sample albums
-- Non-destructive additions to support public portfolio browsing and studio samples
-- ==============================================================================

-- 1. Homepage Photos Table
create table if not exists public.homepage_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  title text not null default '',
  alt text not null default '',
  label text not null default '',
  category text not null default 'Bridal portraits',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_photos_order_idx on public.homepage_photos(display_order);

alter table public.homepage_photos enable row level security;

-- Public can view active homepage photos; admins can view all
drop policy if exists homepage_photos_read on public.homepage_photos;
create policy homepage_photos_read on public.homepage_photos
  for select to anon, authenticated
  using (is_active = true or private.is_admin());

-- Only admins can insert, update, or delete homepage photos
drop policy if exists homepage_photos_admin on public.homepage_photos;
create policy homepage_photos_admin on public.homepage_photos
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

grant select on public.homepage_photos to anon, authenticated;
grant insert, update, delete on public.homepage_photos to authenticated;

-- Add updated_at trigger for homepage_photos (safe to rerun)
drop trigger if exists homepage_photos_updated on public.homepage_photos;
create trigger homepage_photos_updated
  before update on public.homepage_photos
  for each row execute function public.set_updated_at();

-- 2. Public Sample Albums Support
-- Allow albums to exist without an attached client profile for studio samples
alter table public.albums alter column client_id drop not null;

-- Add is_public flag to albums (default false to guarantee existing albums stay private)
alter table public.albums add column if not exists is_public boolean not null default false;

-- Add is_public flag to photos (default false to guarantee all photos stay private by default)
alter table public.photos add column if not exists is_public boolean not null default false;

-- Safe backfill: ensure no client-owned album has is_public = true before adding the constraint.
-- This corrects any unsafe state without deleting data or changing ownership.
update public.albums set is_public = false where is_public = true and client_id is not null;

-- Database-enforced invariant: only studio samples (client_id IS NULL) can be public.
-- is_public is NOT NULL so this cannot be bypassed with a null value.
alter table public.albums drop constraint if exists albums_public_studio_only_check;
alter table public.albums add constraint albums_public_studio_only_check
  check (not is_public or client_id is null);

-- Preserve strict client ownership check in private.can_read_album
-- Public sample access is handled by dedicated public RLS policies, keeping client isolation intact.
create or replace function private.can_read_album(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.is_admin() or exists(
   select 1 from public.albums a
   join public.profiles p on p.id = a.client_id
   where a.id = target and p.id = (select auth.uid()) and p.is_active and not p.must_change_password
 );
$$;

-- RLS policies for reading public studio sample albums (strictly for albums without an assigned client)
drop policy if exists albums_public_read on public.albums;
create policy albums_public_read on public.albums
  for select to anon, authenticated
  using (is_public = true and client_id is null);

drop policy if exists photos_public_read on public.photos;
create policy photos_public_read on public.photos
  for select to anon, authenticated
  using (
    is_public = true and exists(
      select 1 from public.albums a where a.id = album_id and a.is_public = true and a.client_id is null
    )
  );

-- RLS policy on storage.objects for public sample web previews in client-photos bucket.
-- Crucial: strictly limited to thumbnail_path (web previews) so master originals are never exposed.
drop policy if exists sample_storage_read on storage.objects;
create policy sample_storage_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'client-photos' and exists(
      select 1 from public.photos p
      join public.albums a on a.id = p.album_id
      where p.thumbnail_path = name
        and p.is_public = true
        and a.is_public = true
        and a.client_id is null
    )
  );
