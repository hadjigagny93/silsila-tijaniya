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
