-- ==============================================================================
-- 202610180002_pixieset_and_drive.sql
-- Phase 3: Pixieset client galleries and Google Drive delivery integration
-- Non-destructive additions to public.albums for client photo delivery links
-- ==============================================================================

-- Add nullable external delivery URL columns to albums
alter table public.albums add column if not exists pixieset_url text;
alter table public.albums add column if not exists google_drive_url text;

-- Add check constraints to enforce HTTPS schemes and prevent unsafe URI schemes in the database
alter table public.albums drop constraint if exists albums_pixieset_url_check;
alter table public.albums add constraint albums_pixieset_url_check
  check (pixieset_url is null or pixieset_url ~* '^https://([a-zA-Z0-9-]+\.)*pixieset\.com(/.*)?$');

alter table public.albums drop constraint if exists albums_google_drive_url_check;
alter table public.albums add constraint albums_google_drive_url_check
  check (google_drive_url is null or google_drive_url ~* '^https://(drive|docs)\.google\.com(/.*)?$');

-- Ensure studio sample albums (where client_id is null) cannot store client delivery links
alter table public.albums drop constraint if exists albums_sample_no_delivery_links_check;
alter table public.albums add constraint albums_sample_no_delivery_links_check
  check (client_id is not null or (pixieset_url is null and google_drive_url is null));
