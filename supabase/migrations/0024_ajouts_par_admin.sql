-- Derniers ajouts : chacun voit les siens et ceux de l'autre admin. Les fiches ajoutées sur le Mac (ou l'iPhone)
-- portent « mac » / « iphone » : mac_owner dit à qui elles appartiennent (le ou les comptes du propriétaire du Mac).
--   update public.admins set mac_owner = true
--     where user_id in (select id from auth.users where email in ('…'));
alter table public.admins add column if not exists mac_owner boolean not null default false;

-- E-mails du propriétaire du Mac : lisibles par les admins et par la synchronisation du Mac, par personne d'autre.
create or replace function public.mac_owner_emails()
returns setof text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from public.admins a
  join auth.users u on u.id = a.user_id
  where a.mac_owner
    and (public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role');
$$;
revoke all on function public.mac_owner_emails() from public, anon;
grant execute on function public.mac_owner_emails() to authenticated, service_role;
