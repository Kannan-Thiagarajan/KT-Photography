-- Require a one-use server-issued token for every new Auth account.
-- This blocks public signup even when the project-wide Auth toggle cannot be changed.
create table public.account_provisioning (
 email text primary key,
 token uuid not null default gen_random_uuid(),
 expires_at timestamptz not null default (now() + interval '5 minutes')
);
alter table public.account_provisioning enable row level security;
revoke all on public.account_provisioning from anon,authenticated;
grant all on public.account_provisioning to service_role;
create function private.require_provisioned_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.account_provisioning where email=lower(new.email)
 and token::text=new.raw_user_meta_data->>'kt_provisioning_token'
 and expires_at>now();
 if not found then raise exception 'Accounts must be created by KT Photography';end if;
 new.raw_user_meta_data=new.raw_user_meta_data-'kt_provisioning_token';
 return new;
end;
$$;
revoke all on function private.require_provisioned_account() from public,anon,authenticated;
create trigger kt_require_provisioned_account before insert on auth.users for each row execute function private.require_provisioned_account();
