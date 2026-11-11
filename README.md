# silsila-tijaniya

Site dédié à la Tijaniya, avec deux sections :

- **Silsila** : chaque membre se connecte et déclare son mouqaddam. Les chaînes se relient jusqu'à Cheikh Ahmad Tijani et au Prophète ﷺ.
- **Biographies** : la vie des cheikhs de la voie, modifiable dans l'application, avec ses sources.

Stack : Next.js et Tailwind CSS, dans Electron avec SQLite pour l'application de bureau. La mise en ligne se fera avec Supabase (base de données, connexion par lien e-mail).

## Application de bureau

Pour l'instant, l'application fonctionne sur un seul Mac, sans compte ni connexion. Ses données sont dans une base SQLite locale.

```bash
npm install
```

Lancer l'application sans l'installer :

```bash
npm run desktop
```

Fabriquer l'application Mac, dans `release/mac-arm64/` :

```bash
npm run dist
```

La base se trouve dans `~/Library/Application Support/Silsila Tijaniya/silsila.db`. Une copie est faite dans le dossier `sauvegardes` à chaque lancement, et les 30 dernières sont gardées. Le menu Données de l'application ouvre ces deux emplacements.

Pour développer dans le navigateur, avec une base séparée :

```bash
echo 'SQLITE_PATH=data/silsila.db' > .env.local
```

```bash
npm run dev
```

## Mettre en ligne avec Supabase

Les données locales devront être reprises dans Supabase : les tables suivent le même schéma.

1. Créer un projet Supabase et exécuter dans l'ordre les fichiers de `supabase/migrations/`.
2. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` (voir `.env.example`).
3. Dans Authentication > URL Configuration, ajouter `<url du site>/auth/callback` aux Redirect URLs.
4. Après votre première connexion, vous déclarer admin dans l'éditeur SQL :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'votre@email';
```

## Règles de la silsila

- Les ajouts sont publiés immédiatement ; les erreurs se corrigent par signalement.
- Seuls les admins ajoutent des mouqaddams ; les membres choisissent dans la liste ou font une demande.
- Chaque membre choisit d'afficher son nom complet ou une forme réduite. Le public ne lit que la vue `public_persons`, qui n'expose jamais le nom complet en forme réduite.
