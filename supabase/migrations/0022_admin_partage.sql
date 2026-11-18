-- Deux admins : l'un travaille sur le Mac, l'autre sur le site. La synchronisation du Mac récupère ce qui a été
-- modifié ou supprimé en ligne (edited_online, site_deletions), puis envoie ses propres changements.
-- Tout est partagé entre les admins (brouillons, notes, fiches cachées, photos des incognitos) ; le public,
-- lui, ne voit toujours que ce qui est publié.

-- Colonnes partagées entre les admins.
alter table public.persons add column if not exists notes text check (char_length(notes) <= 20000);
alter table public.persons add column if not exists updated_at timestamptz not null default now();
alter table public.biographies add column if not exists local_only boolean not null default false;
alter table public.person_links add column if not exists updated_at timestamptz not null default now();

-- edited_online : la ligne a été modifiée sur le site (par un admin connecté), pas par la synchronisation du Mac
-- (clé service_role). Seules ces lignes sont récupérées par le Mac.
alter table public.persons add column if not exists edited_online boolean not null default false;
alter table public.biographies add column if not exists edited_online boolean not null default false;
alter table public.person_images add column if not exists edited_online boolean not null default false;
alter table public.place_images add column if not exists edited_online boolean not null default false;
alter table public.person_links add column if not exists edited_online boolean not null default false;

create or replace function public.touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.edited_online := coalesce(auth.jwt() ->> 'role', '') <> 'service_role';
  return new;
end;
$$;

do $$
declare
  name text;
begin
  foreach name in array array['persons', 'biographies', 'person_images', 'place_images', 'person_links'] loop
    execute format('drop trigger if exists %I on public.%I', name || '_touch', name);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.touch_row()',
      name || '_touch',
      name
    );
  end loop;
end;
$$;

-- Ce que l'admin du site supprime : le Mac le supprime aussi à sa prochaine synchronisation.
create table if not exists public.site_deletions (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_key text not null,
  deleted_at timestamptz not null default now()
);
create index if not exists site_deletions_at_idx on public.site_deletions (deleted_at);
alter table public.site_deletions enable row level security;
drop policy if exists "site_deletions: admins" on public.site_deletions;
create policy "site_deletions: admins" on public.site_deletions
  for select to authenticated using (public.is_admin());

create or replace function public.log_site_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    insert into public.site_deletions (table_name, row_key) values (tg_table_name, to_jsonb(old) ->> tg_argv[0]);
  end if;
  return old;
end;
$$;

drop trigger if exists persons_log_delete on public.persons;
create trigger persons_log_delete after delete on public.persons
  for each row execute function public.log_site_deletion('id');
drop trigger if exists biographies_log_delete on public.biographies;
create trigger biographies_log_delete after delete on public.biographies
  for each row execute function public.log_site_deletion('slug');
drop trigger if exists person_images_log_delete on public.person_images;
create trigger person_images_log_delete after delete on public.person_images
  for each row execute function public.log_site_deletion('person_id');
drop trigger if exists place_images_log_delete on public.place_images;
create trigger place_images_log_delete after delete on public.place_images
  for each row execute function public.log_site_deletion('person_id');
drop trigger if exists person_links_log_delete on public.person_links;
create trigger person_links_log_delete after delete on public.person_links
  for each row execute function public.log_site_deletion('id');

-- Le public ne lit pas les biographies gardées hors ligne ; les admins, si.
drop policy if exists "biographies: lecture publique" on public.biographies;
create policy "biographies: lecture publique" on public.biographies
  for select to anon, authenticated using (not local_only or public.is_admin());

-- La photo d'un incognito est en ligne pour les admins, jamais pour le public.
create or replace function public.person_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.persons where id = target and not hidden and not incognito);
$$;
drop policy if exists "person_images: lecture admin" on public.person_images;
create policy "person_images: lecture admin" on public.person_images
  for select to authenticated using (public.is_admin());
drop policy if exists "place_images: lecture admin" on public.place_images;
create policy "place_images: lecture admin" on public.place_images
  for select to authenticated using (public.is_admin());

-- Les admins traitent les contributions depuis le site.
grant select, update on public.contributions to authenticated;
drop policy if exists "contributions: admins" on public.contributions;
create policy "contributions: admins" on public.contributions
  for select to authenticated using (public.is_admin());
drop policy if exists "contributions: traitement admin" on public.contributions;
create policy "contributions: traitement admin" on public.contributions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
