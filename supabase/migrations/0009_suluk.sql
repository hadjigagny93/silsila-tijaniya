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
