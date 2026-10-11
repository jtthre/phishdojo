---
name: verifier
description: Lance toute la batterie de tests du projet (fuite, sécurité, SQL, navigateur) et résume ce qui passe ou casse. À utiliser avant tout commit envoyé sur GitHub ou quand on demande si tout est vert.
allowed-tools: Bash(npm test) Bash(npm run:*) Bash(npx playwright:*) Read Grep Glob
---

Lance, dans cet ordre, en t'arrêtant pour diagnostiquer au premier échec :

1. `npm test` : test de fuite, règles de sécurité des pages, garde-fou de déploiement, fraîcheur de la relecture wolof. **Bloquant.** Un échec du test de fuite veut dire qu'une donnée personnelle peut partir en clair : corrige la cause, jamais le test.
2. `npm run test:sql` : migrations, tests du schéma et tests d'attaque. Il faut Docker Desktop lancé, ou un Postgres et les variables `PGHOST`/`PGUSER`/`PGPASSWORD`. Sinon, dis-le clairement : la CI le fera.
3. `npm run test:e2e` : parcours et sécurité dans Chromium (XSS, CSP, encadrement, OCR local, zéro requête externe). Si les navigateurs manquent : `npx playwright install chromium`, une fois.
4. Si des workflows ont changé et que `zizmor` est installé : `zizmor --offline .github/workflows`.

Réponds par un tableau court : suite, résultat, nombre de tests, et pour chaque échec la cause en une phrase. Termine par la ligne « Noms libres non masqués : x/10 » lue dans la sortie du test de fuite.
