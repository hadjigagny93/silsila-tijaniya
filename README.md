# silsila-tijaniya

Site dédié à la Tijaniya, avec deux sections :

- **Silsila** : chaque membre se connecte et déclare son mouqaddam. Les chaînes se relient jusqu'à Cheikh Ahmad Tijani et au Prophète ﷺ.
- **Biographies** : la vie des cheikhs de la voie, dans `src/content/biographies.ts`.

Stack : Next.js, Tailwind CSS et Supabase (base de données, connexion par lien e-mail).

## Lancer le site sans Supabase

```bash
npm install
```

```bash
echo 'DEMO_MODE=1' > .env.local
```

```bash
npm run dev
```

Le mode démo garde les données en mémoire et connecte sans vérification. L'adresse `admin@demo.local` donne accès à l'administration. Ne jamais l'activer en production.

## Brancher Supabase

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
