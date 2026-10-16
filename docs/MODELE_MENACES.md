# Modèle de menaces et plan de tests d'attaque

Version V1, octobre 2026. Ce document dit ce qu'on protège, contre qui, avec quelles mesures, et comment les attaquer pour vérifier qu'elles tiennent. Il sert de base aux tests d'intrusion de fin de projet.

## 1. Ce qu'on protège

| Actif | Pourquoi c'est sensible | Où il vit |
| --- | --- | --- |
| Identité des personnes qui signalent | Une victime d'arnaque peut être exposée, moquée ou recontactée | Ne doit exister nulle part |
| Données personnelles dans les messages (numéros, noms, montants, codes) | Elles concernent la victime et parfois des tiers | Navigateur seulement, avant masquage |
| Corpus de signalements masqués | Base du jeu de données et du détecteur | Supabase, table `signalements` |
| Clé HMAC des expéditeurs | Permettrait de retrouver un numéro à partir de son empreinte | Supabase, schéma `prive` |
| Intégrité du site et de la chaîne de déploiement | Un site modifié pourrait voler les messages avant masquage | GitHub (dépôt, Actions, Pages) |
| Jetons (Supabase, Claude) | Accès à la base ou à l'abonnement | Secrets GitHub |
| Modèles entraînés | Un modèle piégé exécuterait du code au chargement, ou fausserait les verdicts du vérificateur | `ml/models/` (pickles), plus tard une version sans code pour le navigateur |

## 2. Qui pourrait attaquer

| Acteur | Motivation | Moyens |
| --- | --- | --- |
| Escroc visé par les signalements | Savoir ce qui est signalé, polluer le corpus, faire taire le projet | Accès public au site et à l'API, scripts |
| Curieux ou chasseur de failles | Trouver une donnée exposée | Outils de test web, lecture du code public |
| Contributeur malveillant | Glisser du code dans le dépôt public | Pull request, issue, dépendance compromise |
| Fournisseur compromis | Attaque de la chaîne d'approvisionnement | Paquet npm ou action GitHub modifiés |

## 3. Menaces et mesures (STRIDE)

| # | Menace | Composant | Mesures en place | Vérifié par |
| --- | --- | --- | --- | --- |
| S1 | Faux site imitant PhishDojo Sénégal pour récolter des messages | Public | Mention « projet indépendant », aucun logo de marque, domaine GitHub Pages unique | — (risque résiduel) |
| S2 | Encadrement du site par une page piège (clickjacking) | Site | Script anti-encadrement (`commun.js`) ; en-tête `frame-ancestors` impossible sur GitHub Pages | `pages.spec.js` |
| T1 | Contournement du masquage du navigateur (requête directe à l'API) | Base | Remasquage par déclencheur, contraintes de taille, colonnes calculées non inscriptibles | `10_test_schema.sql`, `20_tests_attaque.sql` |
| T2 | Contournement par chiffres « exotiques » ou caractères invisibles | Masquage | Normalisation NFKC et suppression des caractères invisibles, côté client et serveur | `fuite.test.js`, test A10 |
| T3 | Modification ou effacement des signalements d'autrui | Base | Rôle `anon` : insertion seule, pas de `UPDATE`, pas de `DELETE` direct, upsert refusé ; suppression seulement avec l'identifiant aléatoire | tests 3b, A4, A5, A9 |
| T4 | Pollution du corpus par de faux signalements | Base | Limite globale de débit (30/min), champ piège, relecture humaine avant publication | test 5 ; risque résiduel accepté |
| T5 | Code malveillant via pull request ou dépendance | CI/CD | Branche `main` protégée, CI obligatoire, `npm ci --ignore-scripts` avec empreintes sha512, actions épinglées par commit, CLI Supabase en version figée, Dependabot, revue des dépendances, CodeQL | CI, OSV-Scanner, Semgrep (`pds-action-non-figee`) |
| T6 | Injection dans un workflow (titre de PR, commentaire) | CI/CD | Aucune donnée d'événement interpolée dans un `run:`, permissions minimales, déploiement sans `workflow_run`, `@claude` réservé au propriétaire | zizmor, CodeQL (actions), Semgrep (`pds-declencheur-dangereux`, `pds-donnee-evenement-interpolee`) |
| T7 | Modèle remplacé par un fichier piégé (pickle qui exécute du code, ou modèle qui laisse passer certains domaines) | Modèle | Modèles produits seulement par `ml/train.py`, qui écrit leurs empreintes SHA-256 dans `ml/models/SHA256SUMS` ; `ml/modeles.py` refuse de charger un fichier dont l'empreinte diffère ; le CNN est chargé avec `weights_only=True` ; le navigateur ne recevra qu'un format sans code (phase B). Limite : une PR qui change à la fois un modèle et ses empreintes passe la CI, le vrai contrôle est la revue de PR | CI (`sha256sum --check`), revue de PR, Semgrep (`pds-pickle-sans-empreinte`, `pds-pickle-interdit`, `pds-torch-load-sans-weights-only`) |
| T8 | Empoisonnement du corpus d'entraînement (flux OpenPhish, jeu Hugging Face, sitemaps ou Common Crawl manipulés) | Modèle | Sources publiques connues, découpe temporelle, contrôle automatique des écarts de construction dans `collect.py`, seules les adresses `http(s)` sont suivies, ablation et rapport relus avant d'adopter un nouveau modèle | Rapport d'entraînement, ablation |
| T9 | Dépendance Python compromise ou vulnérable | ML | Toutes les dépendances figées, indirectes comprises, avec empreintes sha256 (`requirements.txt` généré depuis `requirements.in` sans aucune version de moins de 7 jours, installation vérifiée par pip), concordance contrôlée par `tests/verrous.test.js` ; pour `ml/`, Dependabot ne propose que des correctifs (les versions sont liées aux modèles entraînés) ; Dependabot sur `ml/`, `ml/space/` et `.github/zizmor/` avec un délai de 7 jours avant toute nouvelle version, OSV-Scanner, revue des dépendances en PR ; les scripts Python ne s'exécutent pas en CI (analyse CodeQL seulement) | `tests/verrous.test.js` (concordance, empreintes, aucune autre source que PyPI), OSV-Scanner, Dependabot, revue des dépendances |
| T10 | Publication accidentelle de code non durci (`archives/`, `ml/`) | Déploiement | Le déploiement ne publie que `web/` | `tests/securite.test.js` |
| T11 | Instructions d'agent tierces piégées (compétence ou agent Claude Code copié d'un autre dépôt, qui pousserait à affaiblir une règle ou à exfiltrer des données) | Outillage | Copie à un commit figé, relue avant chaque mise à jour, provenance et licence dans `.claude/SOURCES_TIERCES.md`, agent tiers limité en outils ; CLAUDE.md prime en cas de conflit ; aucune extension à crochets (hooks) dans le dépôt. Hors dépôt : le plugin de Matt Pocock installé chez Junior ne contient que des compétences, sans crochet (vérifié le 15 octobre 2026) | Revue de PR |
| T12 | Outil d'analyse compromis (image Semgrep, ZAP ou OSV-Scanner, ou paquet zizmor piégé) | CI/CD | zizmor installé avec `pip --require-hashes --no-deps` depuis `.github/zizmor/requirements.txt` (empreintes PyPI, version d'au moins une semaine, suivie par Dependabot) ; Images Semgrep, ZAP et Postgres figées par empreinte, à monter à la main (Dependabot ne suit pas les images de `container:`, `services:` ni `docker_name:`) ; action OSV figée par commit, mais elle référence son image par version ; jeux `p/*` du registre Semgrep téléchargés à chaque exécution (données de règles, non bloquants) ; jobs sans aucun secret, droits minimaux (ZAP : aucun) ; ZAP en mode passif seulement | zizmor, Semgrep (`pds-action-non-figee`) |
| R1 | Contestation d'un signalement | Base | Identifiant de signalement remis à la personne | — |
| I1 | Fuite de données personnelles dans le texte stocké | Masquage | Double masquage, masquage manuel, relecture avant publication | `fuite.test.js` (zéro fuite bloquant) |
| I2 | Lecture de la table par le public | Base | RLS activée, aucun `SELECT` pour `anon`, schéma `prive` non exposé | tests 3a, A1 |
| I3 | Retrouver un expéditeur à partir de son empreinte | Base | HMAC-SHA256 avec clé aléatoire de 32 octets stockée hors API | test A1 |
| I4 | Fuite de l'adresse IP ou du contenu vers des tiers | Site (toutes les pages, accueil compris) | Polices et OCR auto-hébergés, CSP `default-src 'self'` (en ligne : la seule adresse exacte de la base), `no-referrer`, `credentials: omit` | `securite.test.js`, tests e2e (zéro requête externe ; en `MODE_TEST`, une seule requête par envoi, vers la base, texte masqué, ni cookie ni referer : `mode-test.spec.js`), Semgrep (`pds-envoi-reseau-hors-signaler`, `pds-ressource-tierce`, `pds-import-css-tiers`), ZAP passif hebdomadaire |
| I5 | Fuite de l'image de capture | Site | OCR dans le navigateur, image jamais envoyée | test e2e OCR |
| I6 | Secret commité dans le dépôt | Dépôt | gitleaks en CI, `.env` ignoré et interdit en lecture à Claude | CI |
| I7 | Clé secrète Supabase publiée dans `config.js` (erreur de variable) | Déploiement | `ecrire-config.js` n'accepte que la clé publishable ou une ancienne clé de rôle `anon` ; `sb_secret_…` ou jeton d'un autre rôle arrêtent le déploiement, sans afficher la clé | `config.test.js` |
| D1 | Saturation de l'insertion qui bloque les vrais signalements | Base | Limite de débit globale | Risque résiduel : un attaquant peut occuper le quota |
| D2 | Abus du Space Hugging Face public (chargement de modèles arbitraires, lots géants) | ML | Liste fermée de modèles (`allow_custom_value=False`), lots plafonnés à 500 lignes | Revue de code |
| E1 | Élévation de `anon` vers les fonctions internes | Base | Fonctions `security definer` avec `search_path` vide, `revoke all from public`, droits ciblés | tests A2, A3, A8 |
| E2 | Exécution de script injecté (XSS) | Site | Rendu par `textContent` ou échappement, CSP sans `unsafe-inline` ni `unsafe-eval`, aucun gestionnaire `on*` | `securite.test.js`, tests e2e XSS et CSP, Semgrep (`pds-html-depuis-saisie`, `pds-code-dynamique`, `pds-code-en-ligne`), ZAP passif hebdomadaire |

## 4. Risques résiduels assumés

- **Noms inconnus sans marqueur** : non masqués automatiquement. Ils sont couverts par le masquage manuel et la relecture avant publication, et mesurés à chaque CI.
- **Limite de débit globale** : un attaquant peut occuper le quota de 30 signalements par minute. Si cela arrive, il faudra ajouter une limite par adresse via une fonction Edge.
- **Pas d'en-têtes HTTP de sécurité** : GitHub Pages ne permet pas d'envoyer d'en-têtes personnalisés. La CSP passe par une balise meta, sans `frame-ancestors` ni HSTS propre au domaine. Héberger derrière Cloudflare Pages ou Netlify lèverait cette limite.
- **Le modèle de détection, une fois embarqué (V3), pourra être sondé** par un escroc pour ajuster ses messages. Le jeu et les réflexes restent utiles même quand le modèle est contourné.
- **Hébergement hors du Sénégal** : la question est à poser à la CDP (docs/AVANT_OUVERTURE.md).

## 5. Plan de tests d'attaque (fin de projet)

À mener sur une instance de test (`MODE_TEST=1`), jamais sur la production ouverte au public. Seule exception : l'analyse ZAP hebdomadaire (`zap.yml`) vise le site publié, en mode passif uniquement (le robot suit les liens et observe, sans attaque ni envoi). Son rapport (`rapport-zap`) est téléchargeable par tout compte GitHub, puisque le dépôt est public. Tout scan actif reste sur une instance de test. Pour les chercheurs externes, `SECURITY.md` limite les tests actifs à leur propre copie du projet. Outils suggérés : navigateur avec outils de développement, Burp Suite ou OWASP ZAP, `curl`, `psql`, zizmor.

### Site

1. **XSS** : charges utiles dans le message, dans les champs, dans l'URL (`?`, `#`). Vérifier que rien ne s'exécute et que la CSP bloque les scripts injectés.
2. **Contournement de la CSP** : chercher une ressource autorisée qui permettrait d'exécuter du code (JSONP, gadget dans `vendor/`).
3. **Clickjacking** : encadrer chaque page depuis un autre domaine.
4. **Fuite vers des tiers** : enregistrer toutes les requêtes réseau pendant un parcours complet. Attendu : seulement le site et l'URL exacte de la base.
5. **Image de capture** : vérifier qu'aucune requête ne contient l'image ni le texte brut.

### API Supabase (avec la clé publishable, rôle `anon`, récupérée dans `config.js`)

1. `GET /rest/v1/signalements` et variantes (`select=*`, en-têtes `Range`, `Prefer: count=exact`) : aucune ligne ne doit sortir.
2. `POST` avec colonnes interdites (`expediteur_empreinte`, `cree_le`), upsert (`Prefer: resolution=merge-duplicates`), `PATCH`, `DELETE`.
3. `POST /rest/v1/rpc/purger`, `remasquer`, et tout nom de fonction du schéma `prive`. En-tête `Accept-Profile: prive`.
4. `/graphql/v1` : introspection, requêtes et mutations sur `signalements`.
5. Contournement du masquage serveur : numéros découpés, chiffres arabes orientaux (٠-٩), espaces insécables, homoglyphes, texte de 2 000 caractères pile.
6. Saturation : mesurer le comportement au-delà de 30 insertions par minute.
7. Suppression : essayer des identifiants prévisibles ; mesurer si les temps de réponse révèlent l'existence d'un identifiant.

### Chaîne CI/CD

1. Ouvrir une pull request depuis un compte tiers avec un titre contenant une injection shell (`$(curl …)`) : rien ne doit s'exécuter avec des secrets.
2. Vérifier qu'une pull request venue d'un fork ne déclenche aucun déploiement.
3. Tenter de commiter un faux secret : gitleaks doit bloquer.
4. Relancer `zizmor`, l'analyse Scorecard et les règles Semgrep maison, puis comparer avec les résultats de la CI. Le rapport ZAP passif hebdomadaire (artefact `rapport-zap`) sert de point de départ pour les tests du site.

### Restitution

Pour chaque test : date, outil, requête exacte, résultat attendu, résultat obtenu, gravité (CVSS 4.0), correction. Les tests qui réussissent sont ajoutés à `tests/` pour ne jamais régresser.
