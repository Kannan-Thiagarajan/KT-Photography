create schema if not exists private;
alter function public.is_admin() set schema private;
alter function public.can_read_album(uuid) set schema private;
create or replace function private.can_read_album(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select private.is_admin() or exists(select 1 from public.albums a join public.profiles p on p.id=a.client_id where a.id=target and p.id=(select auth.uid()) and p.is_active and not p.must_change_password);
$$;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated,service_role;
revoke all on function private.is_admin() from public,anon;
revoke all on function private.can_read_album(uuid) from public,anon;
grant execute on function private.is_admin(),private.can_read_album(uuid) to authenticated,service_role;
revoke all on function public.set_updated_at() from public,anon,authenticated;
create table public.upload_jobs (
 storage_path text primary key,
 admin_id uuid not null references public.profiles(id) on delete cascade,
 album_id uuid references public.albums(id) on delete cascade,
 bucket text not null check(bucket in ('client-photos','public-assets')),
 status text not null default 'prepared' check(status in ('prepared','processing','complete','failed')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index upload_jobs_admin_idx on public.upload_jobs(admin_id);
create index upload_jobs_album_idx on public.upload_jobs(album_id);
alter table public.upload_jobs enable row level security;
create policy upload_jobs_admin on public.upload_jobs for all to authenticated using(private.is_admin()) with check(private.is_admin());
grant select,insert,update,delete on public.upload_jobs to authenticated;
