create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 150),
  email text not null unique,
  role text not null default 'client' check (role in ('admin','client')),
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(title) between 1 and 180), description text not null default '',
  cover_image_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index albums_client_idx on public.albums(client_id);
create table public.photos (
  id uuid primary key default gen_random_uuid(), album_id uuid not null references public.albums(id) on delete cascade,
  storage_path text not null unique, thumbnail_path text not null unique,
  filename text not null, file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  width integer not null, height integer not null,
  created_at timestamptz not null default now()
);
create index photos_album_created_idx on public.photos(album_id,created_at);
create table public.packages (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  title text not null, description text not null, price integer not null check(price >= 0),
  included_hours integer not null check(included_hours > 0), features text[] not null default '{}',
  best_for text[] not null default '{}', badge text, image_path text,
  display_order integer not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_active);
$$;
create function public.can_read_album(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or exists(select 1 from public.albums a join public.profiles p on p.id=a.client_id where a.id=target and p.id=(select auth.uid()) and p.is_active and not p.must_change_password);
$$;
revoke all on function public.is_admin() from public;
revoke all on function public.can_read_album(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_read_album(uuid) to authenticated;
create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now();return new;end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger albums_updated before update on public.albums for each row execute function public.set_updated_at();
create trigger packages_updated before update on public.packages for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.packages enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_admin());
create policy profiles_admin on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy albums_read on public.albums for select to authenticated using(public.can_read_album(id));
create policy albums_admin on public.albums for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy photos_read on public.photos for select to authenticated using(public.can_read_album(album_id));
create policy photos_admin on public.photos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy packages_public on public.packages for select to anon,authenticated using(is_active);
create policy packages_admin on public.packages for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.packages to anon;
grant select,insert,update,delete on public.profiles,public.albums,public.photos,public.packages to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('client-photos','client-photos',false,26214400,array['image/jpeg','image/png','image/webp']),
 ('public-assets','public-assets',true,8388608,array['image/jpeg','image/png','image/webp']);
create policy client_storage_read on storage.objects for select to authenticated using (
 bucket_id='client-photos' and (public.is_admin() or exists(select 1 from public.photos p where (p.storage_path=name or p.thumbnail_path=name) and public.can_read_album(p.album_id)))
);
create policy client_storage_admin on storage.objects for all to authenticated using(bucket_id='client-photos' and public.is_admin()) with check(bucket_id='client-photos' and public.is_admin());
create policy public_storage_read on storage.objects for select to anon,authenticated using(bucket_id='public-assets');
create policy public_storage_admin on storage.objects for all to authenticated using(bucket_id='public-assets' and public.is_admin()) with check(bucket_id='public-assets' and public.is_admin());
insert into public.packages(slug,title,description,price,included_hours,features,best_for,badge,display_order) values
 ('signature','KT Signature','Hourly photo session',300,2,array['Digital softcopies only','RM150 base rate / minimum 2 hours'],array['Model shoots','Portraits','Graduation / Convocation','ROM / Marriage','Baby Shower / Cradling','Personal branding'],null,0),
 ('classic','KT Classic','Standard essentials',999,3,array['24" × 10" custom photo album','Handcrafted suitcase','16" × 20" wall display frame','Tabletop photo art'],array['ROM / Marriage','Graduation ceremonies','Birthday parties','Baby Shower & Cradling','Family reunions','Housewarming'],'Best value',1),
 ('elegance','KT Elegance','Medium event package',1299,3,array['30" × 10" custom photo album','Handcrafted suitcase','16" × 24" wall display frame','Tabletop photo art'],array['ROM / Marriage','Sangeet / Pre-Wedding','Engagement','Graduation events','Corporate galas'],'Popular album',2),
 ('grand','KT Grand','Extended coverage',1499,4,array['30" × 12" custom photo album','Handcrafted suitcase','20" × 30" wall display frame','Tabletop photo art'],array['Full wedding day','ROM + Reception','Large celebrations','Product launches','Anniversary galas'],'Most popular',3),
 ('elite','KT Elite','Complete premium bundle',1599,4,array['36" × 12" premium masterpiece album','Handcrafted suitcase','20" × 30" wall display frame','Tabletop photo art'],array['Grand wedding celebrations','Multi-Day events','Clients wanting largest print masterpiece'],'Biggest album',4);
