---
name: livrer
description: Envoie le travail en cours sur GitHub proprement - branche, commit, push, pull request avec fusion automatique quand la CI est verte. À utiliser quand Junior dit « envoie », « pousse », « publie » ou « livre ».
---

`main` est protégée : on n'y pousse jamais directement.

1. Lance la compétence `/verifier`. Si le test de fuite ou les règles de sécurité échouent, arrête-toi et explique.
2. Relis le diff avec la grille de `docs/MODELE_MENACES.md` (rien ne part en clair, rien de tiers n'est chargé, aucun droit public nouveau sans test d'attaque). Lance l'agent `gardien-confidentialite` si `web/`, `supabase/`, `scripts/`, `ml/` ou `.github/` sont touchés.
3. Si on est sur `main` : `git pull --ff-only`, puis `git switch -c maj/<sujet-court>`.
4. `git add -A`, puis commit en français, au présent, une ligne de titre + un court paragraphe si utile.
5. `git push -u origin <branche>` (demande l'accord de Junior la première fois de la session).
6. `gh pr create --base main --title "<titre>" --body "<ce qui change, tests lancés, verdict du gardien>"`, puis `gh pr merge --auto --squash --delete-branch`.
7. `gh pr checks --watch` : si la CI échoue, lis le journal (`gh run view --log-failed`), corrige sur la même branche et repousse.
8. Une fois fusionné : `git switch main && git pull --ff-only`, et donne le lien de la PR.
