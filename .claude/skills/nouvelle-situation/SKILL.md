---
name: nouvelle-situation
description: Règles de contenu pour écrire ou modifier une situation de sensibilisation PhishDojo Sénégal (web/situations.js).
---

Une situation apprend un réflexe, elle n'apprend pas à arnaquer.

**Format** (voir `web/situations.js`) : `scene` (le contexte en deux phrases maximum), `choix` (trois réflexes, un seul juste, position variable), `bonne`, `pourquoi` (l'explication), `methode` (le nom de la méthode), `tech` (taxonomie de la base quand elle s'applique : `code_annulation`, `faux_agent`, `faux_gain`, `trop_percu`, `faux_fournisseur`, `qr_code`, `faux_emploi`, `faux_colis`, `faux_placement`, sinon `autre`).

**Interdits** (règle 5 de CLAUDE.md, « réaliste mais désamorcé ») : un message d'arnaque cliquable, ou un script d'arnaque locale reproduit en entier (on l'annote) ; un domaine qui n'est ni réservé (`.example`, `.test`) ni neutralisé (`[.]`) ; un logo ou une charte d'opérateur, de banque ou d'administration (les noms peuvent être cités) ; un vrai numéro, un vrai lien ou un vrai nom de personne.

**Langue** : chaque texte est en français, dans la structure `{ fr: … }` (prête pour d'autres langues). N'ajoute jamais de version wolof écrite par toi (règle 7 de CLAUDE.md).

**Bon réflexe de référence** : raccrocher, ne jamais donner de code reçu par SMS, rappeler soi-même le service client depuis l'application officielle, signaler (signalementcyber.dgpn.sn, DSC, commissariat).
