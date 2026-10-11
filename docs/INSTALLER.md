# Mettre la base en service

Sans ces étapes, le site fonctionne en **mode démonstration** : rien n'est envoyé. Compte 15 minutes.

## 1. Créer le projet Supabase

1. Créer un compte sur [supabase.com](https://supabase.com), puis un projet nommé `phishdojo-senegal`.
2. **Région** : il n'existe pas de région en Afrique de l'Ouest. Choisir une région européenne. Héberger hors du Sénégal constitue un transfert de données au sens de la loi 2008-12. Le masquage en amont réduit fortement ce qui est concerné, mais la question est à poser à la CDP avant d'ouvrir la collecte au public.
3. Noter le mot de passe de la base.
4. Dans *Project Settings → General*, relever le **Project ref** (20 caractères).
5. Dans *Project Settings → API Keys*, relever la clé **publishable** (`sb_publishable_…`). L'URL du projet est `https://<Project ref>.supabase.co`. Ne jamais prendre la clé **secret** (`sb_secret_…`) ni l'ancienne `service_role` : elles donnent tous les droits sur la base, et le déploiement les refuse.
6. Dans *Account → Access Tokens*, créer un jeton d'accès.

## 2. Renseigner le dépôt GitHub

*Settings → Secrets and variables → Actions* :

| Type | Nom | Valeur |
| --- | --- | --- |
| Secret | `SUPABASE_ACCESS_TOKEN` | le jeton d'accès |
| Secret | `SUPABASE_DB_PASSWORD` | le mot de passe de la base |
| Variable | `SUPABASE_PROJECT_REF` | le Project ref |
| Variable | `SUPABASE_URL` | `https://<ref>.supabase.co` |
| Variable | `SUPABASE_ANON_KEY` | la clé publishable (`sb_publishable_…`) |
| Variable | `MODE_TEST` | `1` pour des essais avant ouverture (bandeau « version de test ») ; à retirer ensuite |

En ligne de commande, depuis le dossier du projet. Chaque commande demande la valeur dans ton terminal ; celle des secrets ne s'affiche pas à la saisie, les variables sont publiques par nature :

```bash
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set SUPABASE_DB_PASSWORD
gh variable set SUPABASE_PROJECT_REF
gh variable set SUPABASE_URL
gh variable set SUPABASE_ANON_KEY
gh variable set MODE_TEST --body 1
```

La clé publishable est publique par conception : elle donne le rôle `anon`, qui ne peut qu'insérer un signalement et en supprimer un avec son identifiant, grâce aux droits posés par la migration. Le site l'envoie dans l'en-tête `apikey` seulement. Une ancienne clé anon (jeton JWT) reste acceptée tant que Supabase la garde active (retrait annoncé pour fin 2026). Une clé secrète (`sb_secret_…` ou jeton `service_role`) fait échouer le déploiement : elle serait sinon publiée dans `config.js`. Si cela arrive, considère-la comme compromise : une variable de dépôt est lisible dans les réglages et dans le journal public du workflow. Révoque-la dans Supabase, puis remplace la variable par la clé publishable.

## 3. Déployer

Pousser sur `main`, ou lancer le workflow **CI/CD** à la main (*Actions → CI/CD → Run workflow*). Dès que la variable `SUPABASE_PROJECT_REF` existe, le job de migrations s'active. Une fois tous les contrôles verts, il **attend ton approbation** (environnement `production`), puis le site est publié avec la configuration. Sans cette variable, les migrations sont sautées et le site part directement en mode démonstration.

## 4. Durcir le projet Supabase

Le rôle public ne peut qu'insérer dans `signalements` (posé par la migration). Réduis aussi la surface autour :

- [ ] *Authentication → Sign In / Providers* : désactiver « Allow new users to sign up ». Le projet n'a pas de comptes utilisateurs.
- [ ] *Integrations → GraphQL* (ou *SQL Editor* : `drop extension if exists pg_graphql;`) : désactiver GraphQL, qui n'est pas utilisé.
- [ ] *Project Settings → Data API* : schémas exposés = `public` seulement (jamais `prive`).
- [ ] *Database → Settings* : « Enforce SSL on incoming connections » activé.
- [ ] *Advisors → Security Advisor* : aucune alerte restante.
- [ ] Double authentification activée sur les comptes Supabase et GitHub.

## 5. Planifier la purge à 24 mois

Dans Supabase : *Database → Extensions*, activer `pg_cron`. Puis dans *SQL Editor* :

```sql
select cron.schedule('purge-signalements', '17 3 * * *', $$select prive.purger()$$);
```

## 6. Vérifier

Tant que `docs/AVANT_OUVERTURE.md` n'est pas entièrement coché, la base n'est branchée qu'avec `MODE_TEST=1`.

1. Envoyer un signalement de test depuis le site en ligne.
2. Dans *Table Editor → signalements* : le texte est masqué, `expediteur` est vide, `expediteur_empreinte` est rempli.
3. Supprimer ce signalement avec son identifiant depuis la page (« Vos données »).

## Avant d'ouvrir au public

La liste fait foi dans `docs/AVANT_OUVERTURE.md` : lecture de capture testée sur un vrai téléphone, wolof relu par deux locuteurs natifs, déclaration CDP. Une fois tout coché, retirer la variable `MODE_TEST`.
