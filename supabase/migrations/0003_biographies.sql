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
