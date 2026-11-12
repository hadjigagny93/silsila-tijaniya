-- Contributions des visiteurs du site : un mouqaddam à ajouter, une biographie à compléter, une information
-- à corriger. Les visiteurs ne lisent ni ne modifient rien : ils déposent, via une fonction qui limite le
-- débit. L'app Mac (clé service_role) les relit, les accepte ou les refuse ; rien n'apparaît sur le site
-- avant la publication suivante.

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mouqaddam', 'biography', 'correction')),
  person_id uuid,
  payload jsonb not null default '{}'::jsonb,
  photo text,
  contributor_name text,
  contributor_contact text,
  client_hash text not null,
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected', 'done')),
  result_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists contributions_status_idx on public.contributions (status, created_at desc);
create index if not exists contributions_client_idx on public.contributions (client_hash, created_at desc);

-- Aucune politique : les visiteurs n'ont aucun accès direct à la table.
alter table public.contributions enable row level security;
revoke all on public.contributions from anon, authenticated;

create or replace function public.submit_contribution(
  p_kind text,
  p_person_id uuid,
  p_payload jsonb,
  p_photo text,
  p_name text,
  p_contact text,
  p_client text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_kind not in ('mouqaddam', 'biography', 'correction') then
    raise exception 'kind';
  end if;
  if p_client is null or length(p_client) < 16 then
    raise exception 'client';
  end if;
  if length(coalesce(p_payload::text, '')) > 60000
    or length(coalesce(p_photo, '')) > 1500000
    or length(coalesce(p_name, '')) > 120
    or length(coalesce(p_contact, '')) > 200 then
    raise exception 'too-long';
  end if;
  -- Cinq envois par heure et par appareil, deux cents par heure en tout.
  if (select count(*) from contributions where client_hash = p_client and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from contributions where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate-limit';
  end if;

  insert into contributions (kind, person_id, payload, photo, contributor_name, contributor_contact, client_hash)
  values (p_kind, p_person_id, coalesce(p_payload, '{}'::jsonb), nullif(p_photo, ''), nullif(trim(p_name), ''),
          nullif(trim(p_contact), ''), p_client)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_contribution(text, uuid, jsonb, text, text, text, text) from public;
grant execute on function public.submit_contribution(text, uuid, jsonb, text, text, text, text) to anon, authenticated;
