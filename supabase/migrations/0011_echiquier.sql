-- L'Échiquier : les cent stations d'al-Harawī, telles que chacun pense les vivre. Privé.

create table public.stations (
  user_id uuid not null references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  degree smallint not null default 0 check (degree between 0 and 4),
  note text check (char_length(note) <= 4000),
  explanation text check (char_length(explanation) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, station)
);

create table public.station_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  degree smallint not null check (degree between 0 and 4),
  at timestamptz not null default now()
);
create index station_history_idx on public.station_history (user_id, station);

create table public.station_moments (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  station text not null check (char_length(station) <= 40),
  day date not null,
  text text not null check (char_length(text) between 1 and 4000),
  primary key (user_id, id)
);

create table public.station_focus (
  user_id uuid primary key references auth.users (id) on delete cascade,
  station text not null check (char_length(station) <= 40),
  start date not null,
  days smallint not null check (days between 1 and 366)
);

alter table public.stations enable row level security;
alter table public.station_history enable row level security;
alter table public.station_moments enable row level security;
alter table public.station_focus enable row level security;

create policy "stations: les siennes" on public.stations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_history: la sienne" on public.station_history
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_moments: les siens" on public.station_moments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "station_focus: la sienne" on public.station_focus
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
