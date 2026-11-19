-- Historique des ajouts : qui a ajouté chaque fiche. Sur le site, l'e-mail de l'admin connecté est noté tout seul ;
-- la synchronisation du Mac envoie « mac » ou « iphone » (vide pour les fiches d'avant l'historique), avec la vraie
-- date d'ajout. La table persons n'est lisible en entier que par les admins : le public ne voit jamais ces e-mails
-- (la vue public_persons ne reprend pas cette colonne).
alter table public.persons add column if not exists added_by text default (auth.jwt() ->> 'email');
create index if not exists persons_created_at_idx on public.persons (created_at desc);
