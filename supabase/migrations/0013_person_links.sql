-- Chaînes argentées : d'autres maîtres dont une personne a aussi reçu le wird (la chaîne dorée reste mouqaddam_id).
create table if not exists person_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons (id) on delete cascade,
  master_id uuid not null references persons (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (person_id, master_id)
);
alter table person_links enable row level security;
create policy "person_links lisibles" on person_links for select using (true);
