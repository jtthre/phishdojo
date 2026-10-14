# Rapport d'entrainement — classifieur de phishing sur URL

Genere le 2026-10-06 en 5 min.

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

AUC ROC sur le test temporel : **0,9733**

Rappel a 0,1 % de faux positifs : **72,7 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9317 | 82,6 % | 91 / 16 566 | 0,55 % [0,45 % – 0,67 %] | 13,1 % | **631** (jusqu'a 756) |
| 90 % | 0,5610 | 90,6 % | 783 / 16 566 | 4,73 % [4,41 % – 5,06 %] | 1,9 % | **4 812** (jusqu'a 5 146) |
| 95 % | 0,1937 | 94,9 % | 2511 / 16 566 | 15,16 % [14,62 % – 15,71 %] | 0,6 % | **15 237** (jusqu'a 15 791) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 467 / 2 440 = 19,14 % [17,63 % – 20,75 %]
- legitimes de domaines jamais vus : 626 / 14 512 = 4,31 % [4,00 % – 4,66 %]
- pages d'accueil legitimes (domaine nu) : 307 / 13 411 = 2,29 % [2,05 % – 2,56 %]

Ablation (seuil 0,5610, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,8233* | 0,8233* | 0,8233* | 0,8233* |
| GitHub | 0,9772* | 0,9772* | 0,9992* | 0,9992* |
| impots.gouv.fr | 0,0713 | 0,0713 | 0,9996* | 0,9996* |
| Google | 0,9219* | 0,9219* | 0,9981* | 0,9981* |
| Wikipedia | 0,1134 | 0,1134 | 0,1361 | 0,1361 |
| service-public | 0,0447 | 0,0447 | 0,9964* | 0,9964* |

Reference legitime : 3/6 — bascule par le seul http : 0/3 — typosquat detecte : 2/3

Attributs les plus utilises (part du gain) :

1. longueur du nom d'hote — 21,7 %
2. hebergeur gratuit (pages.dev, blogspot...) — 11,1 %
3. longueur du chemin — 10,2 %
4. proportion de chiffres — 6,2 %
5. chiffres dans le nom d'hote — 5,9 %
6. mots d'appat dans le chemin — 5,4 %
7. profondeur du chemin — 5,4 %
8. nombre de sous-domaines — 5,3 %
9. URL d'apparence aleatoire — 4,3 %
10. domaine a quelques lettres d'une marque — 3,4 %

### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 342 / 11 380 | 0,9863 | 91,3 % |
| Temporelle, domaines nouveaux | 28 128 / 16 566 | 0,9746 | 75,3 % |

La decoupe aleatoire surestime le rappel de **16,0 points** : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.

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
