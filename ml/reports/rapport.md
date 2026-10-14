# Rapport d'entrainement — classifieur de phishing sur URL

Genere le 2026-10-05 en 5 min.

## Question

A quel taux de faux positifs peut-on detecter 90 % des URL de phishing, sur des campagnes que le modele n'a jamais vues ?

## Protocole

- Entrainement : tout ce qui precede le 2026-02-03 (+ corpus historique non date et typosquats synthetiques).
- Validation : du 2026-02-03 au 2026-06-12, coupee en deux (arret precoce / calibration et choix des seuils).
- Test : a partir du 2026-06-12, phishing sur domaines jamais vus (5062 URL retirees car domaine deja connu), aucune URL synthetique.
- Projection : 100 000 URL par jour, 1 phishing pour 1 000.
- Schema http/https retire de l'entree des deux modeles.
- Les 6 domaines de l'ablation sont absents de tout le corpus ; wikipedia.org et letsdefend.io ne figurent meme pas dans la liste de marques.

| Ensemble | Phishing | Legitimes |
| --- | --- | --- |
| train | 216 331 | 102 199 |
| val_arret | 11 653 | 4 046 |
| val_calib | 11 654 | 4 047 |
| test | 28 094 | 16 566 |

## Resultats

### LightGBM sur attributs (le mien)

AUC ROC sur le test temporel : **0,9849**

Rappel a 0,1 % de faux positifs : **80,9 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9235 | 82,1 % | 26 / 16 566 | 0,16 % [0,11 % – 0,23 %] | 34,4 % | **239** (jusqu'a 312) |
| 90 % | 0,6769 | 90,0 % | 229 / 16 566 | 1,38 % [1,22 % – 1,57 %] | 6,1 % | **1 471** (jusqu'a 1 660) |
| 95 % | 0,2732 | 94,6 % | 1168 / 16 566 | 7,05 % [6,67 % – 7,45 %] | 1,3 % | **7 138** (jusqu'a 7 538) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 33 / 2 440 = 1,35 % [0,96 % – 1,89 %]
- legitimes de domaines jamais vus : 225 / 14 512 = 1,55 % [1,36 % – 1,76 %]
- pages d'accueil legitimes (domaine nu) : 196 / 13 411 = 1,46 % [1,27 % – 1,68 %]

Ablation (seuil 0,6769, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,8592* | 0,8592* | 0,8592* | 0,8592* |
| GitHub | 0,5140 | 0,5140 | 0,9737* | 0,9737* |
| impots.gouv.fr | 0,0226 | 0,0226 | 0,9883* | 0,9883* |
| Google | 0,1432 | 0,1432 | 0,9684* | 0,9684* |
| Wikipedia | 0,0448 | 0,0448 | 0,0450 | 0,0450 |
| service-public | 0,0507 | 0,0507 | 0,9919* | 0,9919* |

Reference legitime : 5/6 — bascule par le seul http : 0/5 — typosquat detecte : 4/5

Attributs les plus utilises (part du gain) :

1. extension du domaine (TLD) — 30,9 %
2. longueur du nom d'hote — 11,5 %
3. longueur du chemin — 8,5 %
4. longueur de l'URL — 5,7 %
5. chiffres dans le nom d'hote — 4,6 %
6. mots d'appat dans le chemin — 4,6 %
7. proportion de chiffres — 4,5 %
8. nombre de sous-domaines — 4,4 %
9. hebergeur gratuit (pages.dev, blogspot...) — 3,9 %
10. profondeur du chemin — 3,7 %

> **Attention : l'extension du domaine porte 30,9 % de la decision.** Verifie qu'elle ne reflete pas la facon dont le corpus a ete construit — les legitimes ont ete choisis en .fr, les phishing viennent d'un flux mondial. Relance avec `python train.py --sans-tld` et compare l'ablation.

### Decoupe aleatoire contre decoupe temporelle

> Section produite par une version anterieure de `train.py`, sur des populations differentes. La comparaison a population egale, qui fait foi, est dans `comparaison_decoupes.md` (ecart de 38,5 points).

| Decoupe | AUC ROC | Rappel a 0,1 % de FP |
| --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 0,9855 | 74,6 % |
| Temporelle, domaines nouveaux (ce projet) | 0,9849 | 80,9 % |

L'ecart mesure ce que la decoupe aleatoire laisse fuir : des URL de la meme campagne de part et d'autre de la frontiere.

### CNN sur caracteres (le mien)

AUC ROC sur le test temporel : **0,9875**

Rappel a 0,1 % de faux positifs : **73,0 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,8983 | 80,4 % | 37 / 16 566 | 0,22 % [0,16 % – 0,31 %] | 26,5 % | **304** (jusqu'a 388) |
| 90 % | 0,6187 | 90,9 % | 184 / 16 566 | 1,11 % [0,96 % – 1,28 %] | 7,6 % | **1 201** (jusqu'a 1 372) |
| 95 % | 0,2756 | 95,5 % | 797 / 16 566 | 4,81 % [4,50 % – 5,15 %] | 1,9 % | **4 902** (jusqu'a 5 238) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 9 / 2 440 = 0,37 % [0,19 % – 0,70 %]
- legitimes de domaines jamais vus : 168 / 14 512 = 1,16 % [1,00 % – 1,35 %]
- pages d'accueil legitimes (domaine nu) : 159 / 13 411 = 1,19 % [1,02 % – 1,38 %]

Ablation (seuil 0,6187, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,9069* | 0,9069* | 0,9018* | 0,9018* |
| GitHub | 0,7666* | 0,7666* | 0,6664* | 0,6664* |
| impots.gouv.fr | 0,3363 | 0,3363 | 0,2503 | 0,2503 |
| Google | 0,9505* | 0,9505* | 0,9475* | 0,9475* |
| Wikipedia | 0,0085 | 0,0085 | 0,0191 | 0,0191 |
| service-public | 0,0139 | 0,0139 | 0,0316 | 0,0316 |

Reference legitime : 3/6 — bascule par le seul http : 0/3 — typosquat detecte : 0/3
