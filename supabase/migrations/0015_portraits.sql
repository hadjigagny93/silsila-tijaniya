-- Accueil : la bande de portraits. Une image partagée par plusieurs personnes (calligraphie par défaut) est écartée.
create or replace view public.public_portraits as
select image.person_id
from public.person_images as image
join public.persons on persons.id = image.person_id
where not persons.hidden
  and persons.display_mode <> 'short'
  and (select count(*) from public.person_images as other where other.data = image.data) = 1;

grant select on public.public_portraits to anon, authenticated;
