# PhishDojo — notes pour Claude

Projet de portfolio Blue Team de Mamadou Lamine Thiore (nom sans accent). PhishDojo aide à **vérifier** un lien, un message ou un fichier, à **s'entraîner** à repérer le phishing, à **signaler** les arnaques (collecte anonymisée) et à **observer** les tendances (renseignement sur la menace). Première édition : le Sénégal (arnaques au mobile money par SMS, WhatsApp et appels, en français et en wolof). Projet non commercial.

Feuille de route complète (refonte, phases A à E, V1 à V4, portes de sortie, cadre légal) : https://claude.ai/code/artifact/04ef7ec2-a046-443b-bf1c-760598484a60

## Contexte et décisions déjà prises

Ce projet a été conçu et développé avec Claude (Cowork) avant d'arriver ici. À respecter sans les rediscuter :

- **But** : projet de portfolio de bout en bout, non commercial, ancré dans le contexte sénégalais actuel ; Junior est en recherche de poste en cybersécurité (Blue Team) en France.
- **Langues** : français et wolof. Le wolof est une première version écrite par Claude, à faire relire.
- **Pile** : site statique sans framework (`web/`, GitHub Pages), Supabase pour la collecte, GitHub Actions pour la CI/CD, Python pour le modèle (`ml/`). Pas de sessions Claude dans le cloud : on travaille ici, en local, et on pousse sur GitHub.
- **Sécurité d'abord** : Junior fera lui-même des tests d'attaque à la fin (plan dans `docs/MODELE_MENACES.md`, section 5).
- **Feuille de route** : V1 signaler et apprendre (faite), V2 jeu de données et détecteur, V3 vérificateur et bot Telegram, V4 observatoire et renseignement (MISP/STIX, Sigma/Wazuh). Détail : https://claude.ai/code/artifact/04ef7ec2-a046-443b-bf1c-760598484a60

### Refonte d'octobre 2026 (décidée avec Junior, remplace ce qui la contredit plus haut)

- **Un seul produit, un seul dépôt** `jtthre/phishdojo` : le site (`web/`), la collecte (`supabase/`), le classifieur d'URL (`ml/`, ex-`phishing-test`) et le premier jeu (`archives/jeu-url-v0/`, à intégrer au Dojo).
- **Nom** : PhishDojo, sans « Sénégal ». Ce qui dépend du pays (formats de numéros, marques, opérateurs, langues, autorités, cadre légal) va dans des « packs pays » ; le Sénégal est la première édition.
- **Ordre de livraison** : A fondations (nom, architecture des pages, système de design, logo) → B vérificateur local avec le modèle d'URL → C refonte du Dojo (parcours grand public et analyste) → D réputation et analyse de fichiers → E observatoire et flux d'IOC. V2 (jeu de données SMS) avance en parallèle selon la collecte.
- **Vérification** : analyse dans le navigateur d'abord. La réputation externe ne part qu'à la demande de la personne, avec le minimum (domaine ou empreinte), via une fonction serveur qui garde les clés. Aucun fichier n'est envoyé à un tiers par défaut ; en phase D, un bouton « Envoyer à VirusTotal », désactivé par défaut et surtout destiné au parcours analyste, le permet après un avertissement clair (le fichier devient téléchargeable par les clients Premium de VirusTotal). Ce jour-là, il faudra étendre explicitement la règle 1 (un seul envoi tiers, opt-in), la règle Semgrep `pds-envoi-reseau-hors-signaler` et `tests/securite.test.js`, ajouter la menace au modèle et la mentionner dans la déclaration CDP.
- **Style** : réponses en français, directes, professionnelles ; « Thiore » s'écrit sans accent ; pas de valeurs factices laissées à remplacer.

## Au début de chaque session

Le hook de démarrage (`.claude/settings.json`) lance `node scripts/avant-ouverture.js`. **S'il reste des points dans `docs/AVANT_OUVERTURE.md`, commence ta première réponse par ce rappel à Junior**, en une ligne par point :

1. tester la lecture de capture sur un vrai téléphone ;
2. faire relire le wolof par deux locuteurs natifs (`docs/RELECTURE_WOLOF.md`) ;
3. déposer la déclaration du traitement auprès de la CDP.

Ne coche jamais ces cases toi-même. Tant qu'elles ne sont pas cochées, le déploiement reste en mode démonstration (ou en `MODE_TEST` avec bandeau), et ce garde-fou ne doit pas être contourné.

## Règles qui ne se discutent pas

1. **Aucune donnée personnelle ne part en clair.** Tout texte saisi par l'utilisateur passe par `web/masquage.js` avant un `fetch`. Ne jamais ajouter de télémétrie, de journalisation du message ou d'outil d'analyse tiers.
2. **Le serveur ne fait pas confiance au client.** Toute nouvelle colonne texte libre doit être remasquée dans le déclencheur `prive.avant_insertion()`.
3. **Le rôle `anon` n'a que `INSERT` sur des colonnes listées**, plus `execute` sur `supprimer_signalement`. Toute nouvelle lecture publique passe par une fonction qui ne renvoie que des agrégats (V4).
4. **Les tests de fuite restent verts.** Une nouvelle règle de masquage s'accompagne d'un cas dans `tests/corpus_fictif.js` ou `tests/fuite.test.js`. Le corpus de test ne contient que des données fictives et aucun message imitant une arnaque.
5. **Réaliste mais désamorcé.** Les simulations du Dojo peuvent être crédibles jusqu'au niveau d'un analyste (en-têtes, chaînes de redirection, propriétés de pièces jointes), mais toujours dans un cadre marqué « exercice » : liens jamais cliquables, sur des domaines réservés (`.example`, `.test`) ou neutralisés (`faceb00k[.]com`), aucun fichier réellement malveillant, aucun vrai numéro ni nom de personne, scripts d'arnaque locaux annotés et jamais reproduits en entier. Les campagnes réelles citées sont sourcées, datées et neutralisées de la même façon.
6. **Pas de logo de marque réelle**, mention « projet indépendant » conservée.
7. **Wolof** : toute nouvelle chaîne wolof est ajoutée à `docs/RELECTURE_WOLOF.md` (colonne « Relu » vide) ; ne jamais présenter un texte wolof comme relu s'il ne l'est pas.
8. **Aucune ressource tierce à l'exécution.** Polices et OCR sont copiés depuis npm dans `web/vendor/` (`scripts/vendre.js`). Pas de CDN, pas de Google Fonts, pas de `<script>` ni de `<style>` en ligne, pas d'attribut `style=` ou `on*=`. La CSP de chaque page reste `default-src 'self'` sans `unsafe-inline` ni `unsafe-eval` : `tests/securite.test.js` le vérifie.
9. **CI/CD** : toute action GitHub est épinglée par empreinte de commit (tag en commentaire), avec `permissions` minimales par job et `persist-credentials: false`. Jamais d'expression `${{ github.event... }}` dans un `run:`. Jamais de déclencheur `pull_request_target` ou `workflow_run`. Installation npm par `npm ci --ignore-scripts`.
10. **Sécurité** : une règle de ce fichier qui peut se vérifier dans le code devient une règle Semgrep dans `semgrep/regles/`, avec ses cas `ruleid:` et `ok:` dans `semgrep/tests/` (lancés par `semgrep --test`). Toute nouvelle surface (page, colonne, fonction, workflow) est ajoutée à `docs/MODELE_MENACES.md` avec sa mesure et son test.
11. **Modèle** : les fichiers `ml/models/*.joblib` et `*.pt` sont des pickles (les charger exécute du code). Ne charger que ceux produits par `ml/train.py`, et mettre à jour `ml/models/SHA256SUMS` à chaque réentraînement (la CI le vérifie). Les données (`ml/data/`) ne sont jamais versionnées ; les dépendances Python restent figées en `==`. Le navigateur ne reçoit qu'un format sans code (phase B).

## Commandes

```bash
npm test                          # test de fuite + garde-fou de déploiement (Node, sans dépendance)
npm run test:sql                  # migrations + tests SQL (PGHOST, sinon conteneur Docker postgres:17)
npm run test:e2e                  # Playwright ; PW_CHROMIUM=/chemin/chromium si navigateur préinstallé
npm run verifier                  # les trois
npm run serve                     # site local sur http://127.0.0.1:4173
npm run rappel                    # état de la checklist d'ouverture
npm run relecture                 # régénère docs/RELECTURE_WOLOF.md (garde la colonne « Relu »)
npm run vendre                    # recopie polices et OCR dans web/vendor (fait par npm install)
semgrep scan --config semgrep/regles/ --error --metrics=off   # règles maison (Semgrep installé à part)
```

## Outils du dépôt pour Claude Code

- Compétences (`.claude/skills/`) : `/verifier` (toute la batterie de tests), `/livrer` (branche, commit, push, PR à fusion automatique), `/nouvelle-migration`, `/nouvelle-situation`, `/avant-ouverture`.
- Agent `gardien-confidentialite` (`.claude/agents/`) : relit le diff avant chaque PR qui touche `web/`, `supabase/`, `scripts/`, `ml/` ou `.github/`.
- Compétences tierces copiées et figées (`.claude/SOURCES_TIERCES.md`, CLAUDE.md prime en cas de conflit) : `frontend-ui-engineering` (système de design, accessibilité, éviter l'esthétique « IA ») et `performance-optimization`, plus l'agent `web-performance-auditor` (Core Web Vitals sur Android d'entrée de gamme), d'Addy Osmani.
- Compétences de Matt Pocock (plugin installé chez Junior) utiles ici : `prototype` pour comparer des directions visuelles (sur une branche jetable, jamais `main`), `domain-modeling` pour le glossaire `CONTEXT.md` et les décisions `docs/adr/`, `wizard` pour les étapes que seul Junior peut faire (domaine, Cloudflare, secrets Supabase), `tdd` pour la parité Python ↔ navigateur de la phase B.
- Permissions (`.claude/settings.json`) : tests, git local et lecture GitHub autorisés ; `git push`, `gh pr create/merge`, `gh api` demandent l'accord de Junior ; force push, `reset --hard` et lecture de `.env` interdits.

## Façon de travailler

- Une issue GitHub = une branche = une pull request, via `/livrer`. Titre en français, description avec : ce qui change, tests lancés, verdict du gardien, lignes wolof à relire.
- Le dossier local est `Documents\phishdojo-senegal` (Windows, nom historique ; le dépôt GitHub est `jtthre/phishdojo`). Docker Desktop est nécessaire pour `npm run test:sql` en local ; sinon la CI s'en charge.
- Chaque fusion dans `main` relance le déploiement : le job de migrations attend l'approbation de Junior (environnement `production`), même sans nouvelle migration. Le prévenir quand une fusion part.
- Alternative manuelle pour Junior : `.\envoyer.ps1 "message"`.
- Commence par un plan court et attends l'accord de Junior si le changement touche la base ou le masquage.
- Ne pousse jamais directement sur `main` ; la CI doit être verte avant fusion.

Une nouvelle migration = un nouveau fichier `supabase/migrations/AAAAMMJJHHMMSS_nom.sql`, jamais la modification d'une migration déjà déployée. Les tests SQL sont des blocs `do $$ ... assert ... $$` avec un `raise notice 'OK n - ...'`.

## Conventions

- Interface, commentaires et messages de commit en français.
- JavaScript sans framework ni étape de build : le dossier `web/` est publié tel quel. ES5/ES2015 compatible avec les navigateurs Android anciens.
- Design : système visuel actuel (papier clair, encre indigo `#1B2550`, or `#E3B12F`), thème clair par défaut, sombre en option ; mise en page testée à 360 px de large. Il sera remplacé par le système de design de la phase A.
- Python (`ml/`) : scripts lancés depuis `ml/`, chemins relatifs à `__file__`, commentaires en français.
- `web/config.js` est réécrit au déploiement par `scripts/ecrire-config.js` : ne pas y mettre de valeur en dur.

## État

- V1 : page de signalement, masquage, schéma Supabase, CI/CD, 12 situations (`web/apprendre.html`), page « Où signaler » — faits. Restent : relecture wolof, test sur vrai téléphone, déclaration CDP, puis tests d'attaque (docs/MODELE_MENACES.md, section 5).
- Base Supabase branchée en `MODE_TEST` (octobre 2026) : migration appliquée, droits vérifiés depuis l'extérieur, purge `pg_cron` planifiée. Durcissement `authenticated` en attente : ticket #14.
- Refonte : phase A en cours (fusion des dépôts faite ; restent le nom affiché sur le site, l'architecture des pages, le système de design et le logo).
- Limite connue et mesurée : les prénoms inconnus sans marqueur ne sont pas masqués automatiquement (masquage manuel + relecture avant publication).
- L'OCR (Tesseract.js) est servi par le site et testé dans Chromium (`pages.spec.js`) ; reste à le tester sur un vrai téléphone.
