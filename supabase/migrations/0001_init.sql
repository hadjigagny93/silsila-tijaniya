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
