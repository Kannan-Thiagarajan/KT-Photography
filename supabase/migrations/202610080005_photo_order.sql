alter table public.photos add column display_order integer;
with ordered as (
 select id, (row_number() over (partition by album_id order by created_at, id) - 1)::integer as position
 from public.photos
)
update public.photos p set display_order = ordered.position from ordered where ordered.id = p.id;
alter table public.photos alter column display_order set not null;
alter table public.photos alter column display_order set default 0;
alter table public.photos add constraint photos_album_order_unique
 unique (album_id, display_order) deferrable initially deferred;

-- Uploads and reorders serialize on the album, so a new photo always appends.
create function private.assign_photo_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.albums where id = new.album_id for update;
 select coalesce(max(display_order), -1) + 1 into new.display_order
 from public.photos where album_id = new.album_id;
 return new;
end;
$$;
revoke all on function private.assign_photo_order() from public, anon, authenticated;
create trigger assign_photo_order before insert on public.photos
 for each row execute function private.assign_photo_order();

create function public.move_album_photo(p_photo_id uuid, p_target_position integer)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 album uuid;
 ordered_ids uuid[];
 target integer;
begin
 if not private.is_admin() or not exists (
  select 1 from public.profiles where id = (select auth.uid()) and not must_change_password
 ) then
  raise exception 'Admin access required' using errcode = '42501';
 end if;
 if p_target_position is null or p_target_position < 0 then
  raise exception 'Choose a valid photo position';
 end if;
 select album_id into album from public.photos where id = p_photo_id;
 if album is null then raise exception 'Photo not found'; end if;
 perform 1 from public.albums where id = album for update;
 select array_agg(id order by display_order, created_at, id) into ordered_ids
 from public.photos where album_id = album;
 if not p_photo_id = any(ordered_ids) then raise exception 'Photo no longer available'; end if;
 ordered_ids := array_remove(ordered_ids, p_photo_id);
 target := least(p_target_position, coalesce(array_length(ordered_ids, 1), 0));
 ordered_ids := coalesce(ordered_ids[1:target], '{}'::uuid[]) || array[p_photo_id]
  || coalesce(ordered_ids[target+1:array_length(ordered_ids, 1)], '{}'::uuid[]);
 update public.photos p set display_order = sequence.position::integer - 1
 from unnest(ordered_ids) with ordinality as sequence(id, position)
 where p.id = sequence.id and p.album_id = album;
 return album;
end;
$$;
revoke all on function public.move_album_photo(uuid, integer) from public, anon;
grant execute on function public.move_album_photo(uuid, integer) to authenticated;
