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
