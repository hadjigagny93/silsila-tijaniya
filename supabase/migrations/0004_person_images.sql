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
