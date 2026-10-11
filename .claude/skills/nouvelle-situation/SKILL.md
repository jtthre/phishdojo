---
name: nouvelle-situation
description: Règles de contenu pour écrire ou modifier une situation de sensibilisation PhishDojo Sénégal (web/situations.js), en français et en wolof.
---

Une situation apprend un réflexe, elle n'apprend pas à arnaquer.

**Format** (voir `web/situations.js`) : `scene` (le contexte en deux phrases maximum), `choix` (trois réflexes, un seul juste, position variable), `bonne`, `pourquoi` (l'explication), `methode` (le nom de la méthode), `tech` (taxonomie de la base quand elle s'applique : `code_annulation`, `faux_agent`, `faux_gain`, `trop_percu`, `faux_fournisseur`, `qr_code`, `faux_emploi`, `faux_colis`, `faux_placement`, sinon `autre`).

**Interdits** : reproduire un message frauduleux, même inventé ; un logo ou une charte d'opérateur, de banque ou d'administration (les noms peuvent être cités) ; un vrai numéro, un vrai lien ou un vrai nom de personne.

**Langues** : chaque texte existe en `fr` et en `wo`. Lance `npm run relecture` : les nouvelles lignes apparaissent avec la colonne « Relu » vide. Dis dans la PR combien de lignes attendent une relecture. Ne présente jamais un texte wolof comme relu.

**Bon réflexe de référence** : raccrocher, ne jamais donner de code reçu par SMS, rappeler soi-même le service client depuis l'application officielle, signaler (signalementcyber.dgpn.sn, DSC, commissariat).
