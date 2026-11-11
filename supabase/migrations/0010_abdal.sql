-- Exercices spirituels, propres à chacun : la Ḥilyat al-Abdāl (faim, silence, solitude, veille),
-- les exercices du cœur et ceux de la conduite. Plus le journal du jour (service rendu, bilan du soir).

create table public.abdal (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  pillar text not null check (pillar in (
    'hunger', 'silence', 'solitude', 'vigil', 'muhasaba', 'muraqaba', 'tafakkur', 'khidma', 'sadaqa', 'adab', 'ilm'
  )),
  days text not null check (days ~ '^[0-6]{1,7}$'),
  start_time text check (start_time ~ '^\d{2}:\d{2}$'),
  end_time text check (end_time ~ '^\d{2}:\d{2}$'),
  note text check (char_length(note) <= 200),
  position integer not null default 0,
  primary key (user_id, id)
);

alter table public.abdal enable row level security;

create policy "abdal: ses exercices" on public.abdal
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.suluk_journal (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  key text not null check (char_length(key) <= 64),
  text text not null check (char_length(text) <= 10000),
  primary key (user_id, day, key)
);

alter table public.suluk_journal enable row level security;

create policy "suluk_journal: son journal" on public.suluk_journal
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
