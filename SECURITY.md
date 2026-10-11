# Politique de sécurité

PhishDojo Sénégal recueille des messages d'arnaque signalés par le public. La confidentialité des personnes qui signalent passe avant tout le reste.

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique**. Utilisez le signalement privé de GitHub : onglet *Security* → *Report a vulnerability*.

Indiquez : la page ou le composant, les étapes pour reproduire, l'impact (donnée exposée, contournement du masquage, écriture non autorisée…). Une première réponse est donnée sous 7 jours.

## Périmètre

| Dans le périmètre | Hors périmètre |
| --- | --- |
| Pages du site (GitHub Pages) | Déni de service volumétrique |
| Masquage dans le navigateur et dans la base | Ingénierie sociale contre le mainteneur |
| Droits de la base Supabase (rôle public `anon`) | Failles de GitHub, Supabase ou des navigateurs eux-mêmes |
| Workflows GitHub Actions du dépôt | Rapports d'outils automatiques sans preuve d'impact |

Les tests d'intrusion actifs contre l'instance de production ne sont autorisés qu'avec l'accord écrit du mainteneur. Le plan de test et les mesures en place sont décrits dans [docs/MODELE_MENACES.md](docs/MODELE_MENACES.md).

## Ce qui est déjà en place

Les mesures sont détaillées dans le modèle de menaces. En résumé :

- masquage sur l'appareil, puis remasquage par la base ;
- rôle public limité à l'insertion ;
- empreinte HMAC à la place du numéro de l'expéditeur ;
- politique de sécurité du contenu sans script ni ressource tiers ;
- CI avec tests de fuite, tests d'attaque SQL, CodeQL, zizmor, gitleaks et revue des dépendances ;
- actions épinglées par empreinte de commit.
