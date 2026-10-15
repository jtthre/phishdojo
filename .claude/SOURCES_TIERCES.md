# Compétences tierces copiées dans ce dépôt

Ces fichiers sont des instructions pour Claude Code écrites par d'autres. Ils sont copiés à un commit précis, sans modification, et relus avant chaque mise à jour : une instruction d'agent tierce est une dépendance comme une autre (voir T11 dans `docs/MODELE_MENACES.md`).

| Source | Licence | Commit | Récupéré le | Fichiers |
| --- | --- | --- | --- | --- |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT ([texte](LICENCE-agent-skills-addyosmani.txt)) | `aeac41d4d005999432bb7312f7ff06383a91d59d` | 15 octobre 2026 | `skills/frontend-ui-engineering/`, `skills/performance-optimization/`, `references/performance-checklist.md`, `references/accessibility-checklist.md`, `agents/web-performance-auditor.md` |

**En cas de conflit, CLAUDE.md prime.** Ces compétences supposent souvent React, Tailwind, un bundler ou un CDN : PhishDojo reste un site sans framework ni étape de build, sans ressource tierce, compatible avec les navigateurs Android anciens, sous CSP stricte. On en garde la méthode (mesurer avant d'optimiser, système de design, accessibilité WCAG 2.1 AA, éviter l'esthétique « générée par IA »), pas les outils.

**Mettre à jour** : recopier depuis un commit précis, relire le diff, mettre à jour ce tableau.
