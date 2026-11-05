-- Séances enchaînées : une séance peut commencer à la fin d'une autre (follows), après une pause (offset_minutes).
alter table litanies add column if not exists follows text;
alter table litanies drop constraint if exists litanies_anchor_check;
alter table litanies add constraint litanies_anchor_check
  check (anchor in ('fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'fixed', 'after'));
