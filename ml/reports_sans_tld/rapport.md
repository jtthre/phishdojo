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
| train | 219 914 | 104 960 |
| val_arret | 11 653 | 4 220 |
| val_calib | 11 654 | 4 220 |
| test | 28 094 | 17 854 |

## Resultats

### LightGBM sur attributs (le mien)

AUC ROC sur le test temporel : **0,9725**

Rappel a 0,1 % de faux positifs : **64,4 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,8916 | 84,0 % | 175 / 17 854 | 0,98 % [0,85 % – 1,14 %] | 7,9 % | **1 063** (jusqu'a 1 218) |
| 90 % | 0,4986 | 90,9 % | 1031 / 17 854 | 5,77 % [5,44 % – 6,13 %] | 1,6 % | **5 860** (jusqu'a 6 211) |
| 95 % | 0,1858 | 95,0 % | 3029 / 17 854 | 16,97 % [16,42 % – 17,52 %] | 0,6 % | **17 043** (jusqu'a 17 601) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 503 / 2 440 = 20,61 % [19,06 % – 22,27 %]
- legitimes de domaines jamais vus : 850 / 15 800 = 5,38 % [5,04 % – 5,74 %]
- pages d'accueil legitimes (domaine nu) : 359 / 13 478 = 2,66 % [2,40 % – 2,95 %]

Ablation (seuil 0,4986, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,7161* | 0,7161* | 0,7161* | 0,7161* |
| GitHub | 0,9756* | 0,9756* | 0,9973* | 0,9973* |
| impots.gouv.fr | 0,0717 | 0,0717 | 0,9998* | 0,9998* |
| Google | 0,8923* | 0,8923* | 0,9984* | 0,9984* |
| Wikipedia | 0,0959 | 0,0959 | 0,1125 | 0,1125 |
| service-public | 0,0464 | 0,0464 | 0,9993* | 0,9993* |
| Senelec | 0,4447 | 0,4447 | 0,4447 | 0,4447 |
| SEN'EAU | 0,0618 | 0,0618 | 0,4654 | 0,4654 |

Reference legitime : 5/8 — bascule par le seul http : 0/5 — typosquat detecte : 2/5

Attributs les plus utilises (part du gain) :

1. longueur du nom d'hote — 21,8 %
2. hebergeur gratuit (pages.dev, blogspot...) — 10,2 %
3. longueur du chemin — 9,7 %
4. proportion de chiffres — 6,6 %
5. chiffres dans le nom d'hote — 5,7 %
6. profondeur du chemin — 5,6 %
7. nombre de sous-domaines — 5,3 %
8. mots d'appat dans le chemin — 5,1 %
9. URL d'apparence aleatoire — 4,7 %
10. domaine a quelques lettres d'une marque — 3,6 %

### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 630 / 12 380 | 0,9855 | 88,3 % [87,1 % – 90,1 %] |
| Temporelle, domaines nouveaux | 28 128 / 17 854 | 0,9736 | 73,0 % [70,4 % – 74,2 %] |

La decoupe aleatoire surestime le rappel de **15,3 points** (IC 95 % bootstrap : 13,3 a 18,1 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.

### CNN sur caracteres (le mien)

AUC ROC sur le test temporel : **0,9876**

Rappel a 0,1 % de faux positifs : **76,3 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9373 | 79,7 % | 42 / 17 854 | 0,24 % [0,17 % – 0,32 %] | 25,3 % | **315** (jusqu'a 397) |
| 90 % | 0,6849 | 90,8 % | 240 / 17 854 | 1,34 % [1,19 % – 1,52 %] | 6,3 % | **1 434** (jusqu'a 1 613) |
| 95 % | 0,2903 | 95,7 % | 967 / 17 854 | 5,42 % [5,09 % – 5,76 %] | 1,7 % | **5 506** (jusqu'a 5 848) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 6 / 2 440 = 0,25 % [0,11 % – 0,54 %]
- legitimes de domaines jamais vus : 220 / 15 800 = 1,39 % [1,22 % – 1,59 %]
- pages d'accueil legitimes (domaine nu) : 204 / 13 478 = 1,51 % [1,32 % – 1,73 %]

Ablation (seuil 0,6849, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,9805* | 0,9805* | 0,9848* | 0,9848* |
| GitHub | 0,8980* | 0,8980* | 0,7594* | 0,7594* |
| impots.gouv.fr | 0,0561 | 0,0561 | 0,0293 | 0,0293 |
| Google | 0,9914* | 0,9914* | 0,9895* | 0,9895* |
| Wikipedia | 0,0135 | 0,0135 | 0,0469 | 0,0469 |
| service-public | 0,0034 | 0,0034 | 0,0054 | 0,0054 |
| Senelec | 0,0057 | 0,0057 | 0,0075 | 0,0075 |
| SEN'EAU | 0,0233 | 0,0233 | 0,0147 | 0,0147 |

Reference legitime : 5/8 — bascule par le seul http : 0/5 — typosquat detecte : 0/5
