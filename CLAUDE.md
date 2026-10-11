# PhishDojo Sénégal — notes pour Claude

Projet de portfolio Blue Team de Mamadou Lamine Thiore (nom sans accent). Collecte anonymisée d'arnaques au mobile money au Sénégal (SMS, WhatsApp, appels), en français et en wolof, puis jeu de données, détecteur et renseignement sur la menace. Projet non commercial.

Feuille de route complète (V1 à V4, portes de sortie, cadre légal) : https://claude.ai/code/artifact/04ef7ec2-a046-443b-bf1c-760598484a60

## Contexte et décisions déjà prises

Ce projet a été conçu et développé avec Claude (Cowork) avant d'arriver ici. À respecter sans les rediscuter :

- **But** : projet de portfolio de bout en bout, non commercial, ancré dans le contexte sénégalais actuel ; Junior est en recherche de poste en cybersécurité (Blue Team) en France.
- **Langues** : français et wolof. Le wolof est une première version écrite par Claude, à faire relire.
- **Pile** : site statique sans framework (GitHub Pages), Supabase pour la collecte, GitHub Actions pour la CI/CD. Pas de sessions Claude dans le cloud : on travaille ici, en local, et on pousse sur GitHub.
- **Sécurité d'abord** : Junior fera lui-même des tests d'attaque à la fin (plan dans `docs/MODELE_MENACES.md`, section 5).
- **Feuille de route** : V1 signaler et apprendre (faite), V2 jeu de données et détecteur, V3 vérificateur et bot Telegram, V4 observatoire et renseignement (MISP/STIX, Sigma/Wazuh). Détail : https://claude.ai/code/artifact/04ef7ec2-a046-443b-bf1c-760598484a60
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
5. **Pas de message frauduleux reproduit** dans l'interface ou le jeu : on décrit la situation, le bon réflexe et le nom de la méthode.
6. **Pas de logo de marque réelle**, mention « projet indépendant » conservée.
7. **Wolof** : toute nouvelle chaîne wolof est ajoutée à `docs/RELECTURE_WOLOF.md` (colonne « Relu » vide) ; ne jamais présenter un texte wolof comme relu s'il ne l'est pas.
8. **Aucune ressource tierce à l'exécution.** Polices et OCR sont copiés depuis npm dans `web/vendor/` (`scripts/vendre.js`). Pas de CDN, pas de Google Fonts, pas de `<script>` ni de `<style>` en ligne, pas d'attribut `style=` ou `on*=`. La CSP de chaque page reste `default-src 'self'` sans `unsafe-inline` ni `unsafe-eval` : `tests/securite.test.js` le vérifie.
9. **CI/CD** : toute action GitHub est épinglée par empreinte de commit (tag en commentaire), avec `permissions` minimales par job et `persist-credentials: false`. Jamais d'expression `${{ github.event... }}` dans un `run:`. Jamais de déclencheur `pull_request_target` ou `workflow_run`. Installation npm par `npm ci --ignore-scripts`.
10. **Sécurité** : toute nouvelle surface (page, colonne, fonction, workflow) est ajoutée à `docs/MODELE_MENACES.md` avec sa mesure et son test.

## Commandes

```bash
npm test                          # test de fuite + garde-fou de déploiement (Node, sans dépendance)
npm run test:sql                  # migrations + tests SQL (PGHOST, sinon conteneur Docker postgres:16)
npm run test:e2e                  # Playwright ; PW_CHROMIUM=/chemin/chromium si navigateur préinstallé
npm run verifier                  # les trois
npm run serve                     # site local sur http://127.0.0.1:4173
npm run rappel                    # état de la checklist d'ouverture
npm run relecture                 # régénère docs/RELECTURE_WOLOF.md (garde la colonne « Relu »)
npm run vendre                    # recopie polices et OCR dans web/vendor (fait par npm install)
```

## Outils du dépôt pour Claude Code

- Compétences (`.claude/skills/`) : `/verifier` (toute la batterie de tests), `/livrer` (branche, commit, push, PR à fusion automatique), `/nouvelle-migration`, `/nouvelle-situation`, `/avant-ouverture`.
- Agent `gardien-confidentialite` (`.claude/agents/`) : relit le diff avant chaque PR qui touche `web/`, `supabase/`, `scripts/` ou `.github/`.
- Permissions (`.claude/settings.json`) : tests, git local et lecture GitHub autorisés ; `git push`, `gh pr create/merge`, `gh api` demandent l'accord de Junior ; force push, `reset --hard` et lecture de `.env` interdits.

## Façon de travailler

- Une issue GitHub = une branche = une pull request, via `/livrer`. Titre en français, description avec : ce qui change, tests lancés, verdict du gardien, lignes wolof à relire.
- Le dossier local est `Documents\phishdojo-senegal` (Windows). Docker Desktop est nécessaire pour `npm run test:sql` en local ; sinon la CI s'en charge.
- Alternative manuelle pour Junior : `.\envoyer.ps1 "message"`.
- Commence par un plan court et attends l'accord de Junior si le changement touche la base ou le masquage.
- Ne pousse jamais directement sur `main` ; la CI doit être verte avant fusion.

Une nouvelle migration = un nouveau fichier `supabase/migrations/AAAAMMJJHHMMSS_nom.sql`, jamais la modification d'une migration déjà déployée. Les tests SQL sont des blocs `do $$ ... assert ... $$` avec un `raise notice 'OK n - ...'`.

## Conventions

- Interface, commentaires et messages de commit en français.
- JavaScript sans framework ni étape de build : le dossier `web/` est publié tel quel. ES5/ES2015 compatible avec les navigateurs Android anciens.
- Design : système visuel de PhishDojo (papier clair, encre indigo `#1B2550`, or `#E3B12F`), thème clair par défaut, sombre en option ; mise en page testée à 360 px de large.
- `web/config.js` est réécrit au déploiement par `scripts/ecrire-config.js` : ne pas y mettre de valeur en dur.

## État

- V1 : page de signalement, masquage, schéma Supabase, CI/CD, 12 situations (`web/apprendre.html`), page « Où signaler » — faits. Restent : relecture wolof, test sur vrai téléphone, déclaration CDP, puis tests d'attaque (docs/MODELE_MENACES.md, section 5).
- Limite connue et mesurée : les prénoms inconnus sans marqueur ne sont pas masqués automatiquement (masquage manuel + relecture avant publication).
- L'OCR (Tesseract.js) est servi par le site et testé dans Chromium (`pages.spec.js`) ; reste à le tester sur un vrai téléphone.
