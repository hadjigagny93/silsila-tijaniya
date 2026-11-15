-- Image d'un lieu qui caractérise une personne : sa zawiya, une ville où elle a vécu… avec une légende.
-- Publiée depuis le Mac comme les photos ; une personne en forme réduite n'en montre aucune.
create table if not exists public.place_images (
  person_id uuid primary key references public.persons (id) on delete cascade,
  data text not null check (char_length(data) <= 1400000),
  caption text check (char_length(caption) <= 200),
  updated_at timestamptz not null default now()
);

alter table public.place_images enable row level security;

drop policy if exists "place_images: lecture publique" on public.place_images;
create policy "place_images: lecture publique" on public.place_images
  for select to anon, authenticated
  using (exists (select 1 from public.persons where id = person_id and not hidden and display_mode <> 'short'));

drop policy if exists "place_images: écriture admin" on public.place_images;
create policy "place_images: écriture admin" on public.place_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
