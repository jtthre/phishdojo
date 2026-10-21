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

AUC ROC sur le test temporel : **0,9841**

Rappel a 0,1 % de faux positifs : **77,8 %**

| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |
| --- | --- | --- | --- | --- | --- | --- |
| 80 % | 0,9269 | 81,5 % | 31 / 17 854 | 0,17 % [0,12 % – 0,25 %] | 32,0 % | **255** (jusqu'a 328) |
| 90 % | 0,6727 | 90,3 % | 280 / 17 854 | 1,57 % [1,40 % – 1,76 %] | 5,4 % | **1 657** (jusqu'a 1 850) |
| 95 % | 0,2487 | 94,9 % | 1478 / 17 854 | 8,28 % [7,88 % – 8,69 %] | 1,1 % | **8 365** (jusqu'a 8 778) |

Faux positifs au seuil « 90 % de rappel », par sous-groupe :

- legitimes francais : 35 / 2 440 = 1,43 % [1,03 % – 1,99 %]
- legitimes de domaines jamais vus : 276 / 15 800 = 1,75 % [1,55 % – 1,96 %]
- pages d'accueil legitimes (domaine nu) : 224 / 13 478 = 1,66 % [1,46 % – 1,89 %]

Ablation (seuil 0,6727, * = classe phishing) :

| Domaine | https + vrai | http + vrai | https + typo | http + typo |
| --- | --- | --- | --- | --- |
| LetsDefend | 0,8525* | 0,8525* | 0,8525* | 0,8525* |
| GitHub | 0,6241 | 0,6241 | 0,9759* | 0,9759* |
| impots.gouv.fr | 0,0195 | 0,0195 | 0,9800* | 0,9800* |
| Google | 0,2548 | 0,2548 | 0,9625* | 0,9625* |
| Wikipedia | 0,0465 | 0,0465 | 0,0454 | 0,0454 |
| service-public | 0,0306 | 0,0306 | 0,9924* | 0,9924* |
| Senelec | 0,1465 | 0,1465 | 0,1302 | 0,1302 |
| SEN'EAU | 0,0497 | 0,0497 | 0,1790 | 0,1790 |

Reference legitime : 7/8 — bascule par le seul http : 0/7 — typosquat detecte : 4/7

Attributs les plus utilises (part du gain) :

1. extension du domaine (TLD) — 31,3 %
2. longueur du nom d'hote — 11,6 %
3. longueur du chemin — 8,8 %
4. longueur de l'URL — 5,2 %
5. chiffres dans le nom d'hote — 4,9 %
6. mots d'appat dans le chemin — 4,4 %
7. nombre de sous-domaines — 4,2 %
8. proportion de chiffres — 4,2 %
9. hebergeur gratuit (pages.dev, blogspot...) — 3,9 %
10. profondeur du chemin — 3,8 %

> **Attention : l'extension du domaine porte 31,3 % de la decision.** Verifie qu'elle ne reflete pas la facon dont le corpus a ete construit — les legitimes ont ete choisis en .fr, les phishing viennent d'un flux mondial. Compare avec `python train.py --sans-tld --sortie sans_tld`.

### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 630 / 12 380 | 0,9925 | 92,4 % [92,0 % – 92,9 %] |
| Temporelle, domaines nouveaux | 28 128 / 17 854 | 0,9713 | 42,6 % [42,0 % – 43,3 %] |

La decoupe aleatoire surestime le rappel de **49,7 points** (IC 95 % bootstrap : 49,0 a 50,6 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.

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
