-- Correctif de 0019 : la règle de lecture interrogeait persons avec les droits du visiteur, qui ne peut pas
-- lire cette table : aucune image de lieu n'était visible. Comme pour les photos, une fonction vérifie
-- avec les droits du propriétaire que la personne est publique (et pas en forme réduite).
create or replace function public.person_place_is_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.persons where id = target and not hidden and display_mode <> 'short'
  );
$$;

drop policy if exists "place_images: lecture publique" on public.place_images;
create policy "place_images: lecture publique" on public.place_images
  for select to anon, authenticated using (public.person_place_is_public(person_id));
