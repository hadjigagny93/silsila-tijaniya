-- Image de couverture choisie pour une biographie. Vide : image attribuée automatiquement.

alter table public.biographies
  add column cover text check (char_length(cover) <= 200);
