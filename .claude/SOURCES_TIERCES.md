# Compétences tierces copiées dans ce dépôt

Ces fichiers sont des instructions pour Claude Code écrites par d'autres. Ils sont copiés à un commit précis, relus avant chaque mise à jour, et modifiés seulement là où c'est indiqué ci-dessous : une instruction d'agent tierce est une dépendance comme une autre (voir T11 dans `docs/MODELE_MENACES.md`).

| Source | Licence | Commit | Récupéré le | Fichiers |
| --- | --- | --- | --- | --- |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | MIT ([texte](LICENCE-agent-skills-addyosmani.txt)) | `aeac41d4d005999432bb7312f7ff06383a91d59d` | 15 octobre 2026 | `skills/frontend-ui-engineering/`, `skills/performance-optimization/`, `references/performance-checklist.md`, `references/accessibility-checklist.md`, `agents/web-performance-auditor.md` |

**Seule modification locale** : `agents/web-performance-auditor.md` reçoit une ligne `tools: Read, Grep, Glob, Bash`. Sans elle, l'agent hériterait de tous les outils, y compris l'écriture et le web ; on l'aligne sur `gardien-confidentialite`.

**En cas de conflit, CLAUDE.md prime.** Ces compétences supposent souvent React, Tailwind, un bundler ou un CDN : PhishDojo reste un site sans framework ni étape de build, sans ressource tierce, compatible avec les navigateurs Android anciens, sous CSP stricte. On en garde la méthode (mesurer avant d'optimiser, système de design, accessibilité WCAG 2.1 AA, éviter l'esthétique « générée par IA »), pas les outils.

**Interdit ici, même si ces fichiers le recommandent** : la mesure sur les visiteurs réels (RUM), la bibliothèque `web-vitals` ou tout script de mesure ou d'analytics dans le site (règle 1 : aucune télémétrie), un CDN (règle 8), et les API CrUX ou PageSpeed appelées avec une clé. On mesure en laboratoire : Lighthouse en local ou en CI, sur une copie du site. Les commandes `npx lighthouse`, `npx lhci` ou `chrome-devtools-mcp` ne sont pas figées : `.claude/settings.json` demande l'accord de Junior avant de les lancer.

**Mettre à jour** : recopier depuis un commit précis, relire le diff, mettre à jour ce tableau.
