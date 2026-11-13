-- « A reçu le wird de » : celui qui a donné le wird à la personne, quand ce n'est pas le maître de sa chaîne
-- dorée. Une simple référence, sans contrainte : la publication peut l'écrire avant la personne visée.
alter table public.persons add column if not exists wird_from_id uuid;

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
  prophet_family,
  case when display_mode = 'short' then null else wird_from_id end as wird_from_id
from public.persons
where not hidden;
