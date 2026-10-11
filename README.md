# PhishDojo Sénégal

**Signaler les arnaques au mobile money sans exposer personne.** Une page où l'on colle un SMS, un message WhatsApp ou une capture d'écran d'arnaque reçue au Sénégal. Le message est masqué **sur le téléphone** avant d'être envoyé, puis une seconde fois par la base de données.

C'est la V1 d'un projet en quatre versions : collecte anonymisée, jeu de données français + wolof, détecteur évalué, puis observatoire et renseignement sur la menace pour les équipes Blue Team. Des jeux de données publics de SMS d'arnaque au mobile money existent pour le Mozambique, la Tanzanie ou le Malawi ; aucun, à ma connaissance, en français ou en wolof pour le Sénégal.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

## Les trois pages

| Page | Rôle |
| --- | --- |
| `index.html` · Signaler | Coller un message ou une capture, vérifier l'aperçu masqué, envoyer |
| `apprendre.html` · S'entraîner | 12 situations locales (faux code d'annulation, faux agent, faux gain, QR code détourné…) : choisir le bon réflexe |
| `ou-signaler.html` · Où signaler | Que faire dans l'heure, plateforme de la Police nationale, dépôt de plainte |

## Ce que fait la V1

| Étape | Où | Ce qui se passe |
| --- | --- | --- |
| Lecture d'une capture | Navigateur | OCR local (Tesseract.js servi par le site) : l'image n'est jamais envoyée |
| Masquage automatique | Navigateur | Numéros, montants, références de transaction, codes, e-mails, noms reconnus, paramètres d'URL |
| Masquage manuel | Navigateur | La personne sélectionne ce qui reste et le masque elle-même |
| Remasquage | Base (déclencheur) | Les identifiants déterministes sont remasqués même si le client est contourné |
| Expéditeur | Base (déclencheur) | Jamais stocké : empreinte HMAC-SHA256 avec une clé interne, pour compter les récidives |
| Droits | Base (RLS) | Le public peut insérer, rien d'autre : ni lire, ni modifier |
| Suppression | Navigateur + base | Un identifiant aléatoire remis à la personne suffit pour supprimer son signalement |
| Conservation | Base | Purge automatique au-delà de 24 mois |

Interface en français et en wolof (relecture native en cours, voir [docs/RELECTURE_WOLOF.md](docs/RELECTURE_WOLOF.md)), thème clair ou sombre, utilisable sur un téléphone d'entrée de gamme.

## Porte de sortie V1 : zéro fuite

`tests/fuite.test.js` génère 100 messages ordinaires remplis de données personnelles **fictives** et vérifie qu'aucune ne survit au masquage :

| Catégorie | Résultat |
| --- | --- |
| Numéros, montants, références, codes, e-mails | 0 fuite (bloquant en CI) |
| Noms connus ou précédés d'un marqueur (« de », « M. », « Madame »…) | 0 fuite (bloquant en CI) |
| Noms inconnus sans marqueur | Non masqués automatiquement : couverts par le masquage manuel et la relecture avant publication |

La dernière ligne est une limite assumée : un masquage automatique ne peut pas reconnaître tous les prénoms. Elle est mesurée à chaque exécution plutôt que cachée.

## Sécurité

| Couche | Mesures | Vérification automatique |
| --- | --- | --- |
| Site | Aucune ressource tierce (polices et OCR auto-hébergés), CSP `default-src 'self'` sans `unsafe-inline`, anti-encadrement, `no-referrer`, rendu sans `innerHTML` de données | `tests/securite.test.js`, tests navigateur (XSS, CSP, encadrement, zéro requête externe) |
| Données | Masquage sur l'appareil + remasquage serveur, normalisation Unicode contre les contournements, HMAC des expéditeurs, purge à 24 mois | test de fuite, tests SQL |
| Base | RLS, rôle public limité à l'insertion, fonctions internes hors API, limite de débit | 12 tests d'attaque SQL (`tests/sql/20_tests_attaque.sql`) |
| CI/CD | Actions épinglées par commit, permissions minimales, `npm ci --ignore-scripts`, pas de `workflow_run`, migrations soumises à approbation | zizmor, CodeQL (JavaScript et workflows), gitleaks, `npm audit`, revue des dépendances, Scorecard |

Modèle de menaces, risques résiduels et plan de tests d'intrusion : [docs/MODELE_MENACES.md](docs/MODELE_MENACES.md). Signalement de vulnérabilité : [SECURITY.md](SECURITY.md).

## Intégration et déploiement continus

| Workflow | Déclencheur | Contenu |
| --- | --- | --- |
| `ci.yml` | Chaque push et pull request | Test de fuite et règles de sécurité · migrations + tests SQL et tests d'attaque sur Postgres 16 · parcours et sécurité dans Chromium · audit des dépendances · audit des workflows (zizmor) · gitleaks. Sur `main`, si tout est vert : migrations Supabase (après approbation) puis publication sur GitHub Pages |
| `codeql.yml` | Push, PR, chaque semaine | Analyse statique du JavaScript et des workflows |
| `scorecard.yml` | Push sur `main`, chaque semaine | Évaluation OpenSSF des pratiques de sécurité du dépôt |

Sans base configurée, le site se publie en **mode démonstration** : rien n'est envoyé, la page affiche exactement ce qui serait parti.

**Garde-fou d'ouverture.** Tant que [docs/AVANT_OUVERTURE.md](docs/AVANT_OUVERTURE.md) n'est pas entièrement coché (lecture de capture testée sur un vrai téléphone, wolof relu par deux locuteurs natifs, déclaration CDP), le déploiement reste en mode démonstration même si la base est configurée. La variable `MODE_TEST=1` permet des essais, avec un bandeau « version de test » sur la page. Ce garde-fou est lui-même testé (`tests/config.test.js`).

## Contribuer

`main` est protégée : tout passe par une pull request, fusionnée seulement si la CI est verte. Sous Windows, `.\envoyer.ps1 "message"` crée la branche, ouvre la PR et active la fusion automatique.

## Lancer en local

```bash
npm install
npm test                                # test de fuite + garde-fou de déploiement
npm run test:sql                        # migrations + tests SQL (Docker ou PGHOST)
npx playwright install chromium && npm run test:e2e
npm run serve                           # http://127.0.0.1:4173
```

## Structure

```
web/                 site statique (GitHub Pages)
  index.html         page de signalement
  masquage.js        masquage, aussi utilisé par les tests Node
  signaler.js        logique de la page
  i18n.js            français et wolof
supabase/migrations/ schéma, droits, déclencheurs
tests/               test de fuite, tests SQL, parcours Playwright
scripts/             configuration au déploiement, checklist d'ouverture, tests SQL, polices et OCR
docs/                installation, modèle de menaces, checklist d'ouverture, relecture du wolof
.claude/             réglages, compétences et agent pour Claude Code
.github/             CI, déploiement, @claude, Dependabot
```

## Feuille de route

| Version | Contenu | État |
| --- | --- | --- |
| V1 | Signalement anonymisé, 12 situations locales, page « Où signaler » | Développée ; reste la checklist d'ouverture |
| V2 | Jeu de données annoté (double annotation, kappa), trois familles de modèles, découpe temporelle, faux positifs par langue | À venir |
| V3 | Vérificateur « Est-ce une arnaque ? » exécuté sur l'appareil, bot Telegram, tests utilisateurs | À venir |
| V4 | Observatoire des tendances, flux STIX 2.1 vers MISP, règle Sigma pour Wazuh, mesure du vieillissement du modèle | À venir |

## Cadre

Projet indépendant de sensibilisation, sans lien avec un opérateur, une banque ou la police. Le traitement relève de la loi sénégalaise n° 2008-12 sur les données personnelles ; la déclaration auprès de la CDP est prévue avant l'ouverture de la collecte au public.

**Auteur** : Mamadou Lamine Thiore. Licence [MIT](LICENSE).
