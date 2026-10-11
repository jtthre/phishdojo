---
name: nouvelle-migration
description: Procédure pour toute modification de la base Supabase (table, colonne, fonction, droits). À utiliser dès qu'un changement touche supabase/migrations.
---

Une migration déjà déployée ne se modifie jamais. Pour tout changement de base :

1. Crée `supabase/migrations/<AAAAMMJJHHMMSS>_<nom_court>.sql` (heure UTC), idempotent autant que possible (`if not exists`, `create or replace`).
2. **Nouvelle colonne de texte libre** : ajoute son remasquage dans `prive.avant_insertion()` (via `prive.remasquer`) dans la même migration.
3. **Droits** : le rôle `anon` ne reçoit que `insert` sur des colonnes listées et `execute` sur des fonctions précises. Toute lecture publique passe par une fonction `security definer` qui ne renvoie que des agrégats, avec un seuil minimal (pas de groupe de moins de 5 signalements).
4. Fonctions : `security definer` + `set search_path = ''` + `revoke all ... from public` puis `grant` ciblé.
5. Ajoute les tests dans `tests/sql/` (`do $$ begin assert ...; raise notice 'OK n - ...'; end $$;`), y compris la tentative refusée pour `anon` dans `20_tests_attaque.sql`.
6. Lance `npm run test:sql`. Si aucun Postgres n'est disponible, dis-le : la CI le vérifiera.
7. Mets à jour `docs/MODELE_MENACES.md` si la surface d'attaque change. Rappelle dans la PR que la migration partira sur Supabase après approbation.
