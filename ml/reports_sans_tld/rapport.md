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

AUC ROC sur le test temporel : **0,9687**

Rappel a 0,1 % de faux positifs : **67,0 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,8304 | 83,0 % | 515 / 31 305 | 1,65 % [1,51 % – 1,79 %] | 4,8 % | **1 726** (jusqu'a 1 873) |
| 90 % | 0,4431 | 90,5 % | 2087 / 31 305 | 6,67 % [6,40 % – 6,95 %] | 1,3 % | **6 750** (jusqu'a 7 032) |
| 95 % | 0,1509 | 95,5 % | 7168 / 31 305 | 22,90 % [22,44 % – 23,37 %] | 0,4 % | **22 970** (jusqu'a 23 438) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 502 / 2 554 = 19,66 % [18,16 % – 21,24 %]
- legitimes de domaines jamais vus : 1817 / 28 795 = 6,31 % [6,04 % – 6,60 %]
- pages d'accueil legitimes (domaine nu) : 1325 / 26 929 = 4,92 % [4,67 % – 5,19 %]

Ablation (seuil 0,4431, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,8211* | 0,8211* | 0,8211* | 0,8211* |
| GitHub | 0,9824* | 0,9824* | 0,9994* | 0,9994* |
| impots.gouv.fr | 0,0757 | 0,0757 | 1,0000* | 1,0000* |
| Google | 0,9334* | 0,9334* | 0,9999* | 0,9999* |
| Wikipedia | 0,1408 | 0,1408 | 0,1616 | 0,1616 |
| service-public | 0,0267 | 0,0267 | 0,9999* | 0,9999* |
| Senelec | 0,5970* | 0,5970* | 0,6210* | 0,6210* |
| SEN'EAU | 0,1359 | 0,1359 | 0,6188* | 0,6188* |

Reference legitime : 4/8 — bascule par le seul http : 0/4 — typosquat detecte : 3/4

Attributs les plus utilises (part du gain) :

1. longueur du nom d'hote — 20,5 %
2. hebergeur gratuit (pages.dev, blogspot...) — 11,7 %
3. longueur du chemin — 10,9 %
4. proportion de chiffres — 7,2 %
5. URL d'apparence aleatoire — 7,1 %
6. domaine d'apparence aleatoire — 4,8 %
7. mots d'appat dans le chemin — 4,7 %
8. chiffres dans le nom d'hote — 4,6 %
9. profondeur du chemin — 4,1 %
10. domaine a quelques lettres d'une marque — 4,0 %

### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 40 709 / 23 752 | 0,9809 | 85,1 % [84,3 % – 86,7 %] |
| Temporelle, domaines nouveaux | 28 128 / 31 305 | 0,9676 | 69,2 % [67,4 % – 69,7 %] |

La decoupe aleatoire surestime le rappel de **15,9 points** (IC 95 % bootstrap : 15,0 a 18,2 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.

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
