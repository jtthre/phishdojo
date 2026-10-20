# PhishDojo

**Vérifier, s'entraîner, signaler, observer : le phishing vu depuis la Blue Team.** PhishDojo réunit un classifieur d'URL évalué comme en SOC, un site où l'on signale des arnaques sans exposer personne, et un entraînement pour reconnaître les pièges, du grand public à l'analyste.

La première édition vise le Sénégal : les arnaques au mobile money par SMS, WhatsApp et appels, en français et en wolof. Le message est masqué **sur le téléphone** avant d'être envoyé, puis une seconde fois par la base de données. Des jeux de données publics de SMS d'arnaque au mobile money existent pour le Mozambique, la Tanzanie ou le Malawi ; aucun, à ma connaissance, en français ou en wolof pour le Sénégal.

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

| Pilier | Ce qui existe | Ce qui vient |
| --- | --- | --- |
| **Vérifier** | Le classifieur d'URL LightGBM ([ml/](ml/README.md)) tourne dans le navigateur : verdict, propriétaire réel du lien, raisons (SHAP), sans aucune requête réseau. Calculs identiques à Python au bit près, vérifiés en CI | Réentraînement avec des sites `.sn` et les marques sénégalaises : sur des pages `.sn` légitimes, 17 % de faux positifs au seuil « 90 % » ([mesure](ml/reports/mesure_sn.md)) ; messages et fichiers (phase D) |
| **S'entraîner** | 12 situations locales ; premier jeu de défis URL et duel contre l'IA ([archives](archives/jeu-url-v0/)) | Un Dojo à deux parcours, grand public et analyste (phase C) |
| **Signaler** | Collecte anonymisée, masquage sur l'appareil, base verrouillée (V1, en mode test) | Ouverture au public après la checklist d'ouverture |
| **Observer** | — | Tendances, flux STIX 2.1 pour MISP, règle Sigma pour Wazuh (phase E) |

**Le résultat le plus important du modèle** : sur les mêmes URL datées, une découpe aléatoire surestime le rappel à 0,1 % de faux positifs de **38,5 points** par rapport à une découpe temporelle (16,0 points pour la variante sans TLD). La plupart des scores publiés sur ce sujet mesurent la mémoire du modèle, pas sa capacité à généraliser. Détail dans [ml/README.md](ml/README.md).

## Les pages du site

| Page | Rôle |
| --- | --- |
| `index.html` · Accueil | Les quatre piliers, le « lequel est le vrai ? », les chiffres du modèle, l'accès au signalement et au Dojo |
| `verifier.html` · Vérifier | Coller un lien ou un message : chaque lien est analysé sur le téléphone par le modèle, avec ses raisons et des détails pour analyste |
| `signaler.html` · Signaler | Coller un message ou une capture, vérifier l'aperçu masqué, envoyer |
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
| CI/CD | Actions épinglées par commit, permissions minimales, `npm ci --ignore-scripts`, pas de `workflow_run`, migrations soumises à approbation | zizmor, CodeQL (JavaScript, Python et workflows), Semgrep (règles maison tirées de CLAUDE.md, testées, et jeux OWASP), OSV-Scanner (npm et pip), gitleaks, `npm audit`, revue des dépendances, Scorecard, ZAP passif sur le site en ligne |

Modèle de menaces, risques résiduels et plan de tests d'intrusion : [docs/MODELE_MENACES.md](docs/MODELE_MENACES.md). Signalement de vulnérabilité : [SECURITY.md](SECURITY.md).

## Intégration et déploiement continus

| Workflow | Déclencheur | Contenu |
| --- | --- | --- |
| `ci.yml` | Chaque push et pull request | Test de fuite et règles de sécurité · migrations + tests SQL et tests d'attaque sur Postgres 17 · parcours et sécurité dans Chromium · audit des dépendances · audit des workflows (zizmor) · gitleaks. Sur `main`, si tout est vert : migrations Supabase (après approbation) puis publication sur GitHub Pages |
| `codeql.yml` | Push, PR, chaque semaine | Analyse statique du JavaScript, du Python et des workflows |
| `scorecard.yml` | Push sur `main`, chaque semaine | Évaluation OpenSSF des pratiques de sécurité du dépôt |
| `analyses.yml` | Push, PR, chaque semaine | Semgrep : 12 règles maison qui traduisent CLAUDE.md (chacune testée, bloquantes) et jeux OWASP ; OSV-Scanner sur toutes les dépendances npm et pip |
| `zap.yml` | Chaque semaine, ou à la main | ZAP en mode passif sur le site publié, rapport en artefact |

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

Pour le classifieur d'URL (Python, depuis `ml/`), voir [ml/README.md](ml/README.md#reproduire).

## Structure

```
web/                 site statique (GitHub Pages)
  index.html         page d'accueil
  verifier.html      vérificateur de liens (moteur-url.js + modele/url-lgbm.js, exporté par ml/exporter_web.py)
  signaler.html      page de signalement
  masquage.js        masquage, aussi utilisé par les tests Node
  signaler.js        logique de la page
  i18n.js            français et wolof
supabase/migrations/ schéma, droits, déclencheurs
ml/                  classifieur d'URL : collecte, attributs, entraînement, rapports, modèles
archives/            premier jeu PhishDojo, à intégrer au Dojo (non publié)
tests/               test de fuite, tests SQL, parcours Playwright
scripts/             configuration au déploiement, checklist d'ouverture, tests SQL, polices et OCR
docs/                installation, modèle de menaces, checklist d'ouverture, relecture du wolof
.claude/             réglages, compétences et agent pour Claude Code
.github/             CI, déploiement, Dependabot
```

## Feuille de route

La refonte d'octobre 2026 réunit le classifieur d'URL et la collecte en un seul produit, livré en cinq phases :

| Phase | Contenu | État |
| --- | --- | --- |
| A. Fondations | Fusion des deux projets, nouveau nom, packs pays, architecture des pages, système de design et logo | Terminée |
| B. Vérificateur local | Le classifieur d'URL dans le navigateur, test de parité Python ↔ navigateur, sites `.sn` mesurés, page « Le modèle » | En cours : vérificateur et parité livrés |
| C. Dojo | Parcours grand public et analyste, imitations d'URL générées, duel contre le modèle, campagnes réelles sourcées et neutralisées | À venir |
| D. Réputation et fichiers | Analyse locale des PDF, Office, SVG et HTML ; réputation à la demande, sans envoyer de fichier | À venir |
| E. Observatoire | Agrégats publics, flux STIX 2.1 vers MISP, règle Sigma pour Wazuh, vieillissement du modèle | À venir |

En parallèle, le jeu de données de SMS en français et en wolof (V2 : double annotation, kappa, découpe temporelle, faux positifs par langue) grandit avec les signalements.

## Cadre

Projet indépendant de sensibilisation, sans lien avec un opérateur, une banque ou la police. Pour l'édition sénégalaise, le traitement relève de la loi sénégalaise n° 2008-12 sur les données personnelles ; la déclaration auprès de la CDP est prévue avant l'ouverture de la collecte au public.

**Auteur** : Mamadou Lamine Thiore. Licence [MIT](LICENSE).
