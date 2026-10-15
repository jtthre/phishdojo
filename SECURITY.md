# Politique de sécurité

PhishDojo recueille des messages d'arnaque signalés par le public et publie un vérificateur et un entraînement. La confidentialité des personnes qui signalent passe avant tout le reste.

## Versions prises en charge

| Version | Prise en charge |
| --- | --- |
| Branche `main` et site publié (https://jtthre.github.io/phishdojo/) | Oui |
| Branches de travail, `archives/` (jamais publié) | Non |

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique**. Utilisez le signalement privé de GitHub : https://github.com/jtthre/phishdojo/security/advisories/new (onglet *Security* → *Report a vulnerability*).

Indiquez : la page ou le composant, les étapes pour reproduire, l'impact (donnée exposée, contournement du masquage, écriture non autorisée…) et, si possible, une correction proposée.

## Délais et divulgation coordonnée

Projet tenu par une seule personne : ces délais sont des objectifs, tenus au mieux.

- Accusé de réception sous 7 jours.
- Évaluation de la gravité (CVSS 4.0) et plan de correction sous 14 jours.
- Publication d'un avis de sécurité GitHub une fois la correction déployée, avec votre accord pour être cité.
- Projet personnel et non commercial : pas de prime, mais une mention dans l'avis si vous le souhaitez.

## Périmètre

| Dans le périmètre | Hors périmètre |
| --- | --- |
| Pages du site (GitHub Pages) | Déni de service volumétrique |
| Masquage dans le navigateur et dans la base | Ingénierie sociale contre le mainteneur |
| Droits de la base Supabase (rôle public `anon`) | Failles de GitHub, Supabase ou des navigateurs eux-mêmes |
| Workflows GitHub Actions du dépôt | Rapports d'outils automatiques sans preuve d'impact |
| Fichiers de modèle et scripts de `ml/` | En-têtes HTTP que GitHub Pages ne permet pas d'envoyer (risque résiduel documenté) |

## Règles de test

- **Tests actifs** (injection, contournement du masquage, écriture dans la base, saturation) : uniquement sur votre propre copie du projet, c'est-à-dire ce dépôt cloné avec votre propre projet Supabase en `MODE_TEST=1` (voir [docs/INSTALLER.md](docs/INSTALLER.md)).
- **Site publié** : observation passive seulement (lire les pages et leurs réponses, sans attaque ni envoi), même tant qu'il affiche le bandeau « version de test ».
- Aucune donnée personnelle réelle dans vos essais : uniquement des données inventées.
- Arrêtez-vous dès la preuve d'impact, sans extraire ni modifier de données d'autrui.

Une recherche menée de bonne foi dans ce cadre ne fera l'objet d'aucune poursuite de ma part. Cet engagement ne vaut que pour moi : il ne couvre pas les tiers (GitHub, Supabase, hébergeurs) et ne constitue pas une autorisation au sens de la loi. Le plan de test et les mesures en place sont décrits dans [docs/MODELE_MENACES.md](docs/MODELE_MENACES.md).

## Ce qui est déjà en place

Les mesures sont détaillées dans le modèle de menaces. En résumé :

- masquage sur l'appareil, puis remasquage par la base ;
- rôle public limité à l'insertion ;
- empreinte HMAC à la place du numéro de l'expéditeur ;
- politique de sécurité du contenu sans script ni ressource tiers ;
- modèles vérifiés par empreinte SHA-256 avant chargement ;
- CI avec tests de fuite, tests d'attaque SQL, CodeQL, Semgrep (règles maison testées), OSV-Scanner, zizmor, gitleaks, revue des dépendances et analyse ZAP passive du site ;
- actions épinglées par empreinte de commit, images par empreinte sha256.

## English summary

Please **do not open a public issue**. Report vulnerabilities privately through GitHub: https://github.com/jtthre/phishdojo/security/advisories/new. Target times, on a best-effort basis (one-person project): acknowledgement within 7 days, assessment and fix plan within 14 days, then coordinated disclosure through a GitHub security advisory once the fix is deployed. Run active tests only against your own copy of the project (this repository with your own Supabase project in `MODE_TEST`), with made-up data; the published site is for passive observation only. I will not pursue good-faith research within these rules; this commitment covers me only, not third parties, and is not a legal authorisation. This is a personal, non-commercial project: no bounty, but credit in the advisory if you wish.
