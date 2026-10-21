# Rapport d'entrainement — classifieur de phishing sur URL

Genere le 2026-10-21 en 5 min.

## Question

A quel taux de faux positifs peut-on detecter 90 % des URL de phishing, sur des campagnes que le modele n'a jamais vues ?

## Protocole

- Entrainement : tout ce qui precede le 2026-02-03 (+ corpus historique non date et typosquats synthetiques).
- Validation : du 2026-02-03 au 2026-06-12, coupee en deux (arret precoce / calibration et choix des seuils).
- Test : a partir du 2026-06-12, phishing sur domaines jamais vus (5062 URL retirees car domaine deja connu), aucune URL synthetique.
- Projection : 100 000 URL par jour, 1 phishing pour 1 000.
- Schema http/https retire de l'entree des deux modeles.
- Les 8 domaines de l'ablation sont absents de tout le corpus ; letsdefend.io, seneau.sn, senelec.sn, wikipedia.org ne figurent meme pas dans la liste de marques.

| Ensemble | Phishing | Legitimes |
| --- | --- | --- |
| train | 216 914 | 142 683 |
| val_arret | 11 653 | 7 677 |
| val_calib | 11 654 | 7 677 |
| test | 28 094 | 31 305 |

## Resultats

### LightGBM sur attributs (le mien)

AUC ROC sur le test temporel : **0,9808**

Rappel a 0,1 % de faux positifs : **70,4 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9022 | 79,8 % | 142 / 31 305 | 0,45 % [0,38 % – 0,53 %] | 15,0 % | **533** (jusqu'a 614) |
| 90 % | 0,5583 | 89,6 % | 857 / 31 305 | 2,74 % [2,56 % – 2,92 %] | 3,2 % | **2 824** (jusqu'a 3 011) |
| 95 % | 0,2142 | 95,2 % | 3473 / 31 305 | 11,09 % [10,75 % – 11,45 %] | 0,9 % | **11 178** (jusqu'a 11 530) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 200 / 2 554 = 7,83 % [6,85 % – 8,94 %]
- legitimes de domaines jamais vus : 724 / 28 795 = 2,51 % [2,34 % – 2,70 %]
- pages d'accueil legitimes (domaine nu) : 621 / 26 929 = 2,31 % [2,13 % – 2,49 %]

Ablation (seuil 0,5583, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,8098* | 0,8098* | 0,8098* | 0,8098* |
| GitHub | 0,6452* | 0,6452* | 0,9798* | 0,9798* |
| impots.gouv.fr | 0,0274 | 0,0274 | 0,9980* | 0,9980* |
| Google | 0,3517 | 0,3517 | 0,9922* | 0,9922* |
| Wikipedia | 0,0517 | 0,0517 | 0,0566 | 0,0566 |
| service-public | 0,0324 | 0,0324 | 0,9990* | 0,9990* |
| Senelec | 0,0045 | 0,0045 | 0,0034 | 0,0034 |
| SEN'EAU | 0,0012 | 0,0012 | 0,0026 | 0,0026 |

Reference legitime : 6/8 — bascule par le seul http : 0/6 — typosquat detecte : 3/6

Attributs les plus utilises (part du gain) :

1. extension du domaine (TLD) — 31,7 %
2. longueur du nom d'hote — 11,1 %
3. longueur du chemin — 9,2 %
4. URL d'apparence aleatoire — 6,5 %
5. hebergeur gratuit (pages.dev, blogspot...) — 5,4 %
6. proportion de chiffres — 4,4 %
7. chiffres dans le nom d'hote — 4,2 %
8. domaine d'apparence aleatoire — 4,0 %
9. mots d'appat dans le chemin — 4,0 %
10. domaine a quelques lettres d'une marque — 3,1 %

> **Attention : l'extension du domaine porte 31,7 % de la decision.** Verifie qu'elle ne reflete pas la facon dont le corpus a ete construit — les legitimes ont ete choisis en .fr, les phishing viennent d'un flux mondial. Compare avec `python train.py --sans-tld --sortie sans_tld`.

### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 40 709 / 23 752 | 0,9898 | 89,6 % [89,0 % – 90,4 %] |
| Temporelle, domaines nouveaux | 28 128 / 31 305 | 0,9762 | 54,8 % [54,2 % – 57,3 %] |

La decoupe aleatoire surestime le rappel de **34,7 points** (IC 95 % bootstrap : 32,4 a 35,8 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.

### CNN sur caracteres (le mien)

AUC ROC sur le test temporel : **0,9864**

Rappel a 0,1 % de faux positifs : **74,0 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9003 | 80,7 % | 97 / 31 305 | 0,31 % [0,25 % – 0,38 %] | 20,7 % | **390** (jusqu'a 458) |
| 90 % | 0,6250 | 90,8 % | 485 / 31 305 | 1,55 % [1,42 % – 1,69 %] | 5,5 % | **1 638** (jusqu'a 1 781) |
| 95 % | 0,2728 | 95,3 % | 1891 / 31 305 | 6,04 % [5,78 % – 6,31 %] | 1,6 % | **6 130** (jusqu'a 6 399) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 27 / 2 554 = 1,06 % [0,73 % – 1,53 %]
- legitimes de domaines jamais vus : 456 / 28 795 = 1,58 % [1,45 % – 1,73 %]
- pages d'accueil legitimes (domaine nu) : 418 / 26 929 = 1,55 % [1,41 % – 1,71 %]

Ablation (seuil 0,6250, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,9755* | 0,9755* | 0,9809* | 0,9809* |
| GitHub | 0,8165* | 0,8165* | 0,7787* | 0,7787* |
| impots.gouv.fr | 0,3786 | 0,3786 | 0,2665 | 0,2665 |
| Google | 0,9581* | 0,9581* | 0,9693* | 0,9693* |
| Wikipedia | 0,0169 | 0,0169 | 0,0570 | 0,0570 |
| service-public | 0,0128 | 0,0128 | 0,0281 | 0,0281 |
| Senelec | 0,0028 | 0,0028 | 0,0043 | 0,0043 |
| SEN'EAU | 0,0153 | 0,0153 | 0,0160 | 0,0160 |

Reference legitime : 5/8 — bascule par le seul http : 0/5 — typosquat detecte : 0/5
