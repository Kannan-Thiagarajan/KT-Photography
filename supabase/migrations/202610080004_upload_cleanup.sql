-- Preserve abandoned upload intents if an album is deleted while a transfer is pending.
alter table public.upload_jobs drop constraint upload_jobs_album_id_fkey;
alter table public.upload_jobs add constraint upload_jobs_album_id_fkey foreign key(album_id) references public.albums(id) on delete set null;
-- Explicit denial complements revoked privileges and documents the provisioning boundary.
create policy provisioning_deny on public.account_provisioning for all to anon,authenticated using(false) with check(false);
