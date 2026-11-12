-- Toutes les migrations, à exécuter une fois dans Supabase > SQL Editor sur un projet vide.

-- ===== 0001_init.sql
-- Silsila : chaque personne pointe vers son mouqaddam, ce qui forme un arbre
-- dont la racine est le Prophète ﷺ.

create type public.person_kind as enum ('prophet', 'cheikh', 'mouqaddam', 'member');
create type public.display_mode as enum ('full', 'short');

create table public.persons (
  id uuid primary key default gen_random_uuid(),
  kind public.person_kind not null default 'member',
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  display_mode public.display_mode not null default 'full',
  city text check (char_length(city) <= 120),
  mouqaddam_id uuid references public.persons (id) on delete set null,
  biography_slug text unique,
  user_id uuid unique references auth.users (id) on delete cascade,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index persons_mouqaddam_id_idx on public.persons (mouqaddam_id);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.mouqaddam_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  city text check (char_length(city) <= 120),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid not null references public.persons (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- security definer : un membre ne peut pas lire les autres lignes de persons.
create function public.check_mouqaddam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_kind public.person_kind;
  cursor_id uuid := new.mouqaddam_id;
begin
  if new.mouqaddam_id is null then
    return new;
  end if;

  select kind into target_kind from public.persons where id = new.mouqaddam_id;
  if target_kind = 'member' then
    raise exception 'Le mouqaddam choisi ne fait pas partie de la liste.';
  end if;
  if target_kind = 'prophet' and new.kind <> 'cheikh' then
    raise exception 'Seul un cheikh peut être rattaché directement au Prophète.';
  end if;

  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'Ce rattachement créerait une boucle dans la chaîne.';
    end if;
    select mouqaddam_id into cursor_id from public.persons where id = cursor_id;
  end loop;

  return new;
end;
$$;

create trigger persons_check_mouqaddam
  before insert or update of mouqaddam_id on public.persons
  for each row execute function public.check_mouqaddam();

-- Un membre ne modifie que ses propres champs de profil.
create function public.protect_person_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() and (
    new.kind is distinct from old.kind
    or new.hidden is distinct from old.hidden
    or new.user_id is distinct from old.user_id
    or new.biography_slug is distinct from old.biography_slug
  ) then
    raise exception 'Modification non autorisée.';
  end if;
  return new;
end;
$$;

create trigger persons_protect_columns
  before update on public.persons
  for each row execute function public.protect_person_columns();

alter table public.persons enable row level security;
alter table public.admins enable row level security;
alter table public.mouqaddam_requests enable row level security;
alter table public.reports enable row level security;

-- Pas de lecture publique de persons : full_name reste privé en mode 'short'.
-- Le public passe uniquement par la vue public_persons.
create policy "persons: lecture de sa fiche" on public.persons
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "persons: création de sa fiche" on public.persons
  for insert to authenticated with check (
    public.is_admin()
    or (user_id = auth.uid() and kind = 'member' and not hidden and biography_slug is null)
  );
create policy "persons: mise à jour de sa fiche" on public.persons
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "persons: suppression admin" on public.persons
  for delete to authenticated using (public.is_admin());

create policy "admins: lecture de son statut" on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy "requests: création" on public.mouqaddam_requests
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
create policy "requests: lecture" on public.mouqaddam_requests
  for select to authenticated using (requester_id = auth.uid() or public.is_admin());
create policy "requests: traitement admin" on public.mouqaddam_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "reports: création" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open');
create policy "reports: lecture admin" on public.reports
  for select to authenticated using (public.is_admin());
create policy "reports: traitement admin" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Vue volontairement exécutée avec les droits de son propriétaire : elle est la
-- seule surface publique et n'expose jamais full_name en mode 'short'.
create view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city
from public.persons
where not hidden;

grant select on public.public_persons to anon, authenticated;

-- ===== 0002_seed.sql
-- Tête de la silsila. Garder en phase avec src/lib/data/seed.ts.
-- Les rattachements incertains restent vides : un admin les complète ensuite.

insert into public.persons (id, kind, full_name, mouqaddam_id, biography_slug) values
  ('00000000-0000-4000-8000-000000000001', 'prophet', 'Le Prophète Muhammad ﷺ', null, null),
  ('00000000-0000-4000-8000-000000000002', 'cheikh', 'Cheikh Ahmad Tijani', '00000000-0000-4000-8000-000000000001', 'ahmad-tijani'),
  ('00000000-0000-4000-8000-000000000003', 'cheikh', 'Sidi Ali Harazem Berrada', '00000000-0000-4000-8000-000000000002', 'ali-harazem'),
  ('00000000-0000-4000-8000-000000000004', 'cheikh', 'Sidi Muhammad al-Ghali', '00000000-0000-4000-8000-000000000002', null),
  ('00000000-0000-4000-8000-000000000005', 'cheikh', 'El Hadj Omar Tall', '00000000-0000-4000-8000-000000000004', 'omar-tall'),
  ('00000000-0000-4000-8000-000000000006', 'cheikh', 'El Hadj Malick Sy', null, 'malick-sy'),
  ('00000000-0000-4000-8000-000000000007', 'cheikh', 'Cheikh Abdoulaye Niasse', null, 'abdoulaye-niasse'),
  ('00000000-0000-4000-8000-000000000008', 'cheikh', 'Cheikh Ibrahima Niasse', '00000000-0000-4000-8000-000000000007', 'ibrahima-niasse');

-- ===== 0003_biographies.sql
-- Les biographies quittent le code pour la base : elles se modifient depuis le site.

create table public.biographies (
  slug text primary key,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  period text not null default '',
  summary text not null default '',
  body text not null default '',
  sources text not null default '',
  draft boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.biographies enable row level security;

create policy "biographies: lecture publique" on public.biographies
  for select to anon, authenticated using (true);
create policy "biographies: écriture admin" on public.biographies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== 0004_person_images.sql
-- Image facultative d'une personne, recadrée côté navigateur avant l'envoi.

create table public.person_images (
  person_id uuid primary key references public.persons (id) on delete cascade,
  data text not null check (char_length(data) <= 700000),
  updated_at timestamptz not null default now()
);

create function public.person_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.persons where id = target and not hidden);
$$;

alter table public.person_images enable row level security;

create policy "person_images: lecture publique" on public.person_images
  for select to anon, authenticated using (public.person_is_public(person_id));
create policy "person_images: écriture admin" on public.person_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Une personne en forme réduite garde son anonymat : pas d'image publique.
create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image
from public.persons
where not hidden;

-- ===== 0005_person_details.sql
-- Fiche détaillée d'un mouqaddam. Les dates restent en texte : « vers 1855 », dates hégiriennes.

alter table public.persons
  add column birth_date text check (char_length(birth_date) <= 120),
  add column death_date text check (char_length(death_date) <= 120),
  add column birth_city text check (char_length(birth_city) <= 120),
  add column zawiya text check (char_length(zawiya) <= 200);

create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image,
  case when display_mode = 'short' then null else birth_date end as birth_date,
  case when display_mode = 'short' then null else death_date end as death_date,
  case when display_mode = 'short' then null else birth_city end as birth_city,
  case when display_mode = 'short' then null else zawiya end as zawiya
from public.persons
where not hidden;

-- ===== 0006_person_nicknames.sql
-- Sobriquets d'un mouqaddam, un par ligne.

alter table public.persons add column nicknames text check (char_length(nicknames) <= 5000);

create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image,
  case when display_mode = 'short' then null else birth_date end as birth_date,
  case when display_mode = 'short' then null else death_date end as death_date,
  case when display_mode = 'short' then null else birth_city end as birth_city,
  case when display_mode = 'short' then null else zawiya end as zawiya,
  case when display_mode = 'short' then null else nicknames end as nicknames
from public.persons
where not hidden;

-- ===== 0007_person_places.sql
-- Lieux de naissance et de décès. Les colonnes birth_date et death_date portent une année.

alter table public.persons
  add column birth_country text check (char_length(birth_country) <= 120),
  add column death_city text check (char_length(death_city) <= 120),
  add column death_country text check (char_length(death_country) <= 120);

create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image,
  case when display_mode = 'short' then null else birth_date end as birth_date,
  case when display_mode = 'short' then null else death_date end as death_date,
  case when display_mode = 'short' then null else birth_city end as birth_city,
  case when display_mode = 'short' then null else zawiya end as zawiya,
  case when display_mode = 'short' then null else nicknames end as nicknames,
  case when display_mode = 'short' then null else birth_country end as birth_country,
  case when display_mode = 'short' then null else death_city end as death_city,
  case when display_mode = 'short' then null else death_country end as death_country
from public.persons
where not hidden;

-- ===== 0008_biography_cover.sql
-- Image de couverture choisie pour une biographie. Vide : image attribuée automatiquement.

alter table public.biographies
  add column cover text check (char_length(cover) <= 200);

-- ===== 0009_suluk.sql
-- Suluk : espace personnel. Chaque utilisateur règle ses heures de prière, ses litanies,
-- et coche ce qu'il a accompli. Privé : chacun ne voit que ses propres lignes.

create table public.suluk_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  city text not null check (char_length(city) <= 120),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  method text not null check (method in ('mwl', 'egypt', 'ummalqura', 'moonsighting', 'france', 'morocco')),
  timezone text not null check (char_length(timezone) <= 64)
);

-- Une ligne par séance : les litanies faites ensemble au même moment, rangées en JSON dans items.
create table public.litanies (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  name text not null default '' check (char_length(name) <= 120),
  arabic text check (char_length(arabic) <= 120),
  anchor text not null check (anchor in ('fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'fixed')),
  offset_minutes integer not null default 0 check (offset_minutes between -720 and 720),
  fixed_time text check (fixed_time ~ '^\d{2}:\d{2}$'),
  count integer check (count between 1 and 1000000),
  days text not null default '0123456' check (days ~ '^[0-6]{1,7}$'),
  note text check (char_length(note) <= 500),
  position integer not null default 0,
  items text check (char_length(items) <= 20000),
  color text check (color ~ '^#[0-9a-f]{6}$'),
  primary key (user_id, id)
);

create table public.wird_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  litany_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, litany_id)
);

alter table public.suluk_settings enable row level security;
alter table public.litanies enable row level security;
alter table public.wird_log enable row level security;

create policy "suluk_settings: ses réglages" on public.suluk_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "litanies: ses litanies" on public.litanies
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "wird_log: son wird" on public.wird_log
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== 0010_abdal.sql
-- Exercices spirituels, propres à chacun : la Ḥilyat al-Abdāl (faim, silence, solitude, veille),
-- les exercices du cœur et ceux de la conduite. Plus le journal du jour (service rendu, bilan du soir).

create table public.abdal (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  pillar text not null check (pillar in (
    'hunger', 'silence', 'solitude', 'vigil', 'muhasaba', 'muraqaba', 'tafakkur', 'khidma', 'sadaqa', 'adab', 'ilm'
  )),
  days text not null check (days ~ '^[0-6]{1,7}$'),
  start_time text check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text check (end_time ~ '^\d{2}:\d{2}$'),
  note text check (char_length(note) <= 200),
  position integer not null default 0,
  primary key (user_id, id)
);

alter table public.abdal enable row level security;

create policy "abdal: ses exercices" on public.abdal
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.suluk_journal (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  key text not null check (char_length(key) <= 64),
  text text not null check (char_length(text) <= 10000),
  primary key (user_id, day, key)
);

alter table public.suluk_journal enable row level security;

create policy "suluk_journal: son journal" on public.suluk_journal
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== 0011_echiquier.sql
-- L'Échiquier : les cent stations d'al-Harawī, telles que chacun pense les vivre. Privé.

create table public.stations (
  user_id uuid not null references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  degree smallint not null default 0 check (degree between 0 and 4),
  note text check (char_length(note) <= 4000),
  explanation text check (char_length(explanation) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, station)
);

create table public.station_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  degree smallint not null check (degree between 0 and 4),
  at timestamptz not null default now()
);
create index station_history_idx on public.station_history (user_id, station);

create table public.station_moments (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  station text not null check (char_length(station) <= 40),
  day date not null,
  text text not null check (char_length(text) between 1 and 4000),
  primary key (user_id, id)
);

create table public.station_focus (
  user_id uuid primary key references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  start date not null,
  days smallint not null check (days between 1 and 366)
);

alter table public.stations enable row level security;
alter table public.station_history enable row level security;
alter table public.station_moments enable row level security;
alter table public.station_focus enable row level security;

create policy "stations: les siennes" on public.stations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_history: la sienne" on public.station_history
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_moments: les siens" on public.station_moments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_focus: la sienne" on public.station_focus
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== 0012_enchainement.sql
-- Séances enchaînées : une séance peut commencer à la fin d'une autre (follows), après une pause (offset_minutes).
alter table litanies add column if not exists follows text;
alter table litanies drop constraint if exists litanies_anchor_check;
alter table litanies add constraint litanies_anchor_check
  check (anchor in ('fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'fixed', 'after'));

-- ===== 0013_person_links.sql
-- Chaînes argentées : d'autres maîtres dont une personne a aussi reçu le wird (la chaîne dorée reste mouqaddam_id).
create table if not exists person_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons (id) on delete cascade,
  master_id uuid not null references persons (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (person_id, master_id)
);
alter table person_links enable row level security;
create policy "person_links lisibles" on person_links for select using (true);

-- ===== 0014_publication.sql
-- La base du Mac est la référence : `npm run publier` la recopie ici avec la clé service_role.
-- Cette migration ajoute ce qui manquait en ligne : le Qutb et l'affichage des chaînes argentées.

alter table public.persons add column if not exists qutb boolean not null default false;

-- La publication (clé service_role) n'a pas d'utilisateur : elle passe la protection des colonnes réservées.
create or replace function public.protect_person_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.is_admin() and (
    new.kind is distinct from old.kind
    or new.hidden is distinct from old.hidden
    or new.user_id is distinct from old.user_id
    or new.biography_slug is distinct from old.biography_slug
    or new.qutb is distinct from old.qutb
  ) then
    raise exception 'Modification non autorisée.';
  end if;
  return new;
end;
$$;

-- Nouvelles colonnes en fin de vue : `create or replace view` n'accepte que l'ajout.
create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image,
  case when display_mode = 'short' then null else birth_date end as birth_date,
  case when display_mode = 'short' then null else death_date end as death_date,
  case when display_mode = 'short' then null else birth_city end as birth_city,
  case when display_mode = 'short' then null else zawiya end as zawiya,
  case when display_mode = 'short' then null else nicknames end as nicknames,
  case when display_mode = 'short' then null else birth_country end as birth_country,
  case when display_mode = 'short' then null else death_city end as death_city,
  case when display_mode = 'short' then null else death_country end as death_country,
  qutb,
  display_mode = 'short' as short
from public.persons
where not hidden;

create policy "person_links: écriture admin" on public.person_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== 0015_portraits.sql
-- Accueil : la bande de portraits. Une image partagée par plusieurs personnes (calligraphie par défaut) est écartée.
create or replace view public.public_portraits as
select image.person_id
from public.person_images as image
join public.persons on persons.id = image.person_id
where not persons.hidden
  and persons.display_mode <> 'short'
  and (select count(*) from public.person_images as other where other.data = image.data) = 1;

grant select on public.public_portraits to anon, authenticated;

-- ===== 0016_prophet_family.sql
-- Famille du Prophète ﷺ : un halo bleu entoure la photo de ces personnes dans la Silsila.
alter table public.persons add column if not exists prophet_family boolean not null default false;

create or replace function public.protect_person_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and not public.is_admin() and (
    new.kind is distinct from old.kind
    or new.hidden is distinct from old.hidden
    or new.user_id is distinct from old.user_id
    or new.biography_slug is distinct from old.biography_slug
    or new.qutb is distinct from old.qutb
    or new.prophet_family is distinct from old.prophet_family
  ) then
    raise exception 'Modification non autorisée.';
  end if;
  return new;
end;
$$;

create or replace view public.public_persons as
select
  id,
  kind,
  mouqaddam_id,
  biography_slug,
  case
    when display_mode = 'short' then
      split_part(btrim(full_name), ' ', 1)
      || case
        when btrim(full_name) like '% %'
          then ' ' || upper(left(regexp_replace(btrim(full_name), '^.*\s', ''), 1)) || '.'
        else ''
      end
    else full_name
  end as display_name,
  case when display_mode = 'short' then null else city end as city,
  display_mode <> 'short'
    and exists (select 1 from public.person_images where person_id = persons.id) as has_image,
  case when display_mode = 'short' then null else birth_date end as birth_date,
  case when display_mode = 'short' then null else death_date end as death_date,
  case when display_mode = 'short' then null else birth_city end as birth_city,
  case when display_mode = 'short' then null else zawiya end as zawiya,
  case when display_mode = 'short' then null else nicknames end as nicknames,
  case when display_mode = 'short' then null else birth_country end as birth_country,
  case when display_mode = 'short' then null else death_city end as death_city,
  case when display_mode = 'short' then null else death_country end as death_country,
  qutb,
  display_mode = 'short' as short,
  prophet_family
from public.persons
where not hidden;

-- ===== 0017_contributions.sql
-- Contributions des visiteurs du site : un mouqaddam à ajouter, une biographie à compléter, une information
-- à corriger. Les visiteurs ne lisent ni ne modifient rien : ils déposent, via une fonction qui limite le
-- débit. L'app Mac (clé service_role) les relit, les accepte ou les refuse ; rien n'apparaît sur le site
-- avant la publication suivante.

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mouqaddam', 'biography', 'correction')),
  person_id uuid,
  payload jsonb not null default '{}'::jsonb,
  photo text,
  contributor_name text,
  contributor_contact text,
  client_hash text not null,
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected', 'done')),
  result_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists contributions_status_idx on public.contributions (status, created_at desc);
create index if not exists contributions_client_idx on public.contributions (client_hash, created_at desc);

-- Aucune politique : les visiteurs n'ont aucun accès direct à la table.
alter table public.contributions enable row level security;
revoke all on public.contributions from anon, authenticated;

create or replace function public.submit_contribution(
  p_kind text,
  p_person_id uuid,
  p_payload jsonb,
  p_photo text,
  p_name text,
  p_contact text,
  p_client text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_kind not in ('mouqaddam', 'biography', 'correction') then
    raise exception 'kind';
  end if;
  if p_client is null or length(p_client) < 16 then
    raise exception 'client';
  end if;
  if length(coalesce(p_payload::text, '')) > 60000
    or length(coalesce(p_photo, '')) > 1500000
    or length(coalesce(p_name, '')) > 120
    or length(coalesce(p_contact, '')) > 200 then
    raise exception 'too-long';
  end if;
  -- Cinq envois par heure et par appareil, deux cents par heure en tout.
  if (select count(*) from contributions where client_hash = p_client and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from contributions where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate-limit';
  end if;

  insert into contributions (kind, person_id, payload, photo, contributor_name, contributor_contact, client_hash)
  values (p_kind, p_person_id, coalesce(p_payload, '{}'::jsonb), nullif(p_photo, ''), nullif(trim(p_name), ''),
          nullif(trim(p_contact), ''), p_client)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_contribution(text, uuid, jsonb, text, text, text, text) from public;
grant execute on function public.submit_contribution(text, uuid, jsonb, text, text, text, text) to anon, authenticated;
