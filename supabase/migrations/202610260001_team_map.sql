begin;

create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.team_settings (
  id boolean primary key default true check (id),
  access_code text not null default replace(gen_random_uuid()::text, '-', '')
);
revoke all on private.team_settings from public, anon, authenticated;
insert into private.team_settings(id) values (true) on conflict do nothing;

create or replace function public.join_team(p_access_code text, p_display_name text default 'Equipo') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from private.team_settings where access_code = p_access_code) then
    raise exception 'El código del equipo no es correcto.';
  end if;
  if exists (select 1 from public.team_members where user_id = auth.uid() and not active) then
    raise exception 'El acceso de este teléfono fue deshabilitado.';
  end if;
  if char_length(btrim(p_display_name)) not between 1 and 80 then
    raise exception 'El nombre del teléfono debe tener entre 1 y 80 caracteres.';
  end if;
  insert into public.team_members(user_id, display_name) values (auth.uid(), btrim(p_display_name))
    on conflict (user_id) do update set display_name = excluded.display_name;
end;
$$;
revoke all on function public.join_team(text,text) from public;
grant execute on function public.join_team(text,text) to authenticated;

create or replace function public.is_team_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where user_id = (select auth.uid()) and active);
$$;
revoke all on function public.is_team_member() from public;
grant execute on function public.is_team_member() to authenticated;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  address text not null default '' check (char_length(address) <= 250),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  province text not null check (char_length(btrim(province)) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  phone text not null default '' check (char_length(phone) <= 50),
  created_by uuid not null references public.team_members(user_id),
  updated_by uuid not null references public.team_members(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_notes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  author_id uuid not null references public.team_members(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists place_notes_place_id_idx on public.place_notes(place_id, created_at desc);
create index if not exists places_created_at_idx on public.places(created_at desc, id);

create or replace function public.stamp_place() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists places_stamp on public.places;
create trigger places_stamp before insert or update on public.places for each row execute function public.stamp_place();

create or replace function public.stamp_note() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at := now();
    new.author_id := auth.uid();
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.author_id := old.author_id;
    new.place_id := old.place_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists notes_stamp on public.place_notes;
create trigger notes_stamp before insert or update on public.place_notes for each row execute function public.stamp_note();

alter table public.team_members enable row level security;
alter table public.places enable row level security;
alter table public.place_notes enable row level security;
revoke all on public.team_members, public.places, public.place_notes from anon, authenticated;
grant select on public.team_members to authenticated;
grant select, insert, update, delete on public.places, public.place_notes to authenticated;
grant all on public.team_members, public.places, public.place_notes to service_role;

drop policy if exists members_read on public.team_members;
create policy members_read on public.team_members for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_team_member()));
drop policy if exists places_read on public.places;
create policy places_read on public.places for select to authenticated using ((select public.is_team_member()));
drop policy if exists places_create on public.places;
create policy places_create on public.places for insert to authenticated with check ((select public.is_team_member()) and created_by = (select auth.uid()));
drop policy if exists places_edit on public.places;
create policy places_edit on public.places for update to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
drop policy if exists places_delete on public.places;
create policy places_delete on public.places for delete to authenticated using ((select public.is_team_member()) and created_by = (select auth.uid()));

drop policy if exists notes_read on public.place_notes;
create policy notes_read on public.place_notes for select to authenticated using ((select public.is_team_member()));
drop policy if exists notes_create on public.place_notes;
create policy notes_create on public.place_notes for insert to authenticated with check ((select public.is_team_member()) and author_id = (select auth.uid()));
drop policy if exists notes_edit on public.place_notes;
create policy notes_edit on public.place_notes for update to authenticated using ((select public.is_team_member()) and author_id = (select auth.uid())) with check ((select public.is_team_member()) and author_id = (select auth.uid()));
drop policy if exists notes_delete on public.place_notes;
create policy notes_delete on public.place_notes for delete to authenticated using ((select public.is_team_member()) and author_id = (select auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'places') then
    alter publication supabase_realtime add table public.places;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'place_notes') then
    alter publication supabase_realtime add table public.place_notes;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
