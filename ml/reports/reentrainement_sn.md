# Réentraînement avec le pack Sénégal : avant / après

Généré par `ml/comparer_modeles.py` le 2026-10-21. Même protocole pour tous : découpe temporelle (test à partir du 2026-06-12), seuils fixés en validation, intervalles de Wilson.

## Test temporel d'origine (même population pour tous)

28094 phishing sur des domaines jamais vus, 16566 légitimes.

| Modèle | AUC | Rappel à 0,1 % de FP | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |
| --- | --- | --- | --- | --- | --- |
| Ancien (publié) | 0,9849 | 80,9 % | 0,16 % [0,11 % – 0,23 %], rappel 82,1 % | 1,38 % [1,22 % – 1,57 %], rappel 90,0 % | 7,05 % [6,67 % – 7,45 %], rappel 94,6 % |
| A, marques seules | 0,9849 | 81,3 % | 0,12 % [0,08 % – 0,19 %], rappel 82,1 % | 1,44 % [1,27 % – 1,64 %], rappel 90,2 % | 7,11 % [6,73 % – 7,51 %], rappel 94,7 % |
| B, marques et pages .sn | 0,9848 | 80,4 % | 0,15 % [0,10 % – 0,22 %], rappel 82,3 % | 1,34 % [1,18 % – 1,53 %], rappel 90,0 % | 7,65 % [7,25 % – 8,06 %], rappel 94,8 % |
| C, B + 1 500 phishing réhébergés en .sn | 0,9849 | 80,7 % | 0,11 % [0,07 % – 0,17 %], rappel 81,6 % | 1,41 % [1,24 % – 1,60 %], rappel 90,2 % | 7,23 % [6,85 % – 7,64 %], rappel 94,8 % |
| D, B + 3 000 (retenu) | 0,9846 | 80,6 % | 0,11 % [0,07 % – 0,17 %], rappel 81,5 % | 1,45 % [1,28 % – 1,65 %], rappel 90,3 % | 7,84 % [7,44 % – 8,25 %], rappel 94,9 % |
| E, B + 5 000 | 0,9846 | 82,6 % | 0,08 % [0,05 % – 0,14 %], rappel 82,3 % | 1,39 % [1,23 % – 1,58 %], rappel 90,2 % | 8,02 % [7,61 % – 8,44 %], rappel 94,9 % |

## Pages .sn légitimes de la période de test (1288 pages de 164 domaines, Common Crawl, jamais vues à l'entraînement)

| Modèle | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |
| --- | --- | --- | --- |
| A, marques seules | 112 (8,70 %, IC 7,28 % – 10,36 %) | 495 (38,43 %, IC 35,81 % – 41,12 %) | 968 (75,16 %, IC 72,72 % – 77,44 %) |
| B, marques et pages .sn | 13 (1,01 %, IC 0,59 % – 1,72 %) | 33 (2,56 %, IC 1,83 % – 3,58 %) | 43 (3,34 %, IC 2,49 % – 4,47 %) |
| C, B + 1 500 phishing réhébergés en .sn | 12 (0,93 %, IC 0,53 % – 1,62 %) | 30 (2,33 %, IC 1,64 % – 3,31 %) | 103 (8,00 %, IC 6,64 % – 9,61 %) |
| D, B + 3 000 (retenu) | 13 (1,01 %, IC 0,59 % – 1,72 %) | 39 (3,03 %, IC 2,22 % – 4,11 %) | 180 (13,98 %, IC 12,19 % – 15,98 %) |
| E, B + 5 000 | 13 (1,01 %, IC 0,59 % – 1,72 %) | 71 (5,51 %, IC 4,39 % – 6,90 %) | 265 (20,57 %, IC 18,46 % – 22,87 %) |

## Les 62 sites .sn tenus à l'écart (`mesure_sn_domaines.txt`, mêmes pages qu'avant)

| Modèle | Pages | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |
| --- | --- | --- | --- | --- |
| Ancien (publié) | 318 | 4 (1,26 %, IC 95 % 0,49 % – 3,19 %) | 55 (17,30 %, IC 95 % 13,54 % – 21,84 %) | 163 (51,26 %, IC 95 % 45,78 % – 56,70 %) |
| A, marques seules | 318 | 2 (0,63 %, IC 95 % 0,17 % – 2,26 %) | 47 (14,78 %, IC 95 % 11,30 % – 19,10 %) | 151 (47,48 %, IC 95 % 42,06 % – 52,97 %) |
| B, marques et pages .sn | 318 | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 2 (0,63 %, IC 95 % 0,17 % – 2,26 %) |
| C, B + 1 500 phishing réhébergés en .sn | 318 | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 1 (0,31 %, IC 95 % 0,06 % – 1,76 %) | 23 (7,23 %, IC 95 % 4,87 % – 10,62 %) |
| D, B + 3 000 (retenu) | 318 | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 1 (0,31 %, IC 95 % 0,06 % – 1,76 %) | 46 (14,47 %, IC 95 % 11,02 % – 18,76 %) |
| E, B + 5 000 | 318 | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 14 (4,40 %, IC 95 % 2,64 % – 7,25 %) | 73 (22,96 %, IC 95 % 18,67 % – 27,88 %) |

## Phishing du test temporel réhébergé en .sn (13265 URL, extension remplacée par `.sn` ou `.com.sn`, jamais vues à l'entraînement)

Mesure le revers d'un modèle qui croirait « `.sn` = légitime ».

| Modèle | Rappel au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |
| --- | --- | --- | --- |
| A, marques seules | 62,5 % | 79,4 % | 88,1 % |
| B, marques et pages .sn | 1,9 % | 8,5 % | 26,8 % |
| C, B + 1 500 phishing réhébergés en .sn | 18,9 % | 51,9 % | 78,5 % |
| D, B + 3 000 (retenu) | 35,0 % | 60,0 % | 88,0 % |
| E, B + 5 000 | 43,4 % | 72,1 % | 92,1 % |

À comparer au rappel sur le phishing d'origine (premier tableau : environ 82, 90 et 95 %).

## Ablation (seuil « 90 % » du modèle, * = classé phishing)

| Domaine | A, marques seules : vrai / imitation | B, marques et pages .sn : vrai / imitation | C, B + 1 500 phishing réhébergés en .sn : vrai / imitation | D, B + 3 000 (retenu) : vrai / imitation | E, B + 5 000 : vrai / imitation |
| --- | --- | --- | --- | --- | --- |
| LetsDefend | 0,89* / 0,89* | 0,82* / 0,82* | 0,91* / 0,91* | 0,85* / 0,85* | 0,86* / 0,86* |
| GitHub | 0,51 / 0,98* | 0,56 / 0,97* | 0,48 / 0,98* | 0,62 / 0,98* | 0,58 / 0,98* |
| impots.gouv.fr | 0,01 / 0,99* | 0,02 / 0,99* | 0,02 / 0,98* | 0,02 / 0,98* | 0,02 / 1,00* |
| Google | 0,12 / 0,93* | 0,22 / 0,97* | 0,17 / 0,94* | 0,25 / 0,96* | 0,29 / 0,98* |
| Wikipedia | 0,05 / 0,06 | 0,05 / 0,05 | 0,05 / 0,06 | 0,05 / 0,05 | 0,04 / 0,05 |
| service-public | 0,05 / 1,00* | 0,06 / 1,00* | 0,05 / 0,99* | 0,03 / 0,99* | 0,03 / 1,00* |
| Senelec | 0,61 / 0,55 | 0,00 / 0,00 | 0,08 / 0,07 | 0,15 / 0,13 | 0,16 / 0,12 |
| SEN'EAU | 0,61 / 0,78* | 0,00 / 0,00 | 0,03 / 0,09 | 0,05 / 0,18 | 0,06 / 0,26 |

## Découpe aléatoire contre découpe temporelle

Le chiffre que le projet met en avant change avec le nouveau code d'attributs. Ce n'est pas du bruit : l'intervalle de confiance par bootstrap (500 tirages du test, phishing et légitimes tirés séparément) est étroit dans les deux cas.

| Calcul | Aléatoire | Temporelle | Écart [IC 95 %] |
| --- | --- | --- | --- |
| Ancien code d'attributs, population d'origine | 92,5 % | 54,0 % | 38,5 points [37,6 – 39,4] |
| Pack Sénégal, population d'origine (`comparaison_decoupes.md`) | 92,7 % | 45,1 % | **47,5 points** [46,6 – 48,2] |
| Pack Sénégal, corpus final avec les pages `.sn` (`rapport.md`) | 92,4 % | 42,6 % | 49,7 points [49,0 – 50,6] |

Le modèle de cette comparaison n'est entraîné que sur des URL datées, donc sans les typosquats synthétiques : il exploite moins bien les nouvelles marques, et son rappel en découpe temporelle baisse. Le modèle publié, lui, n'a rien perdu : 80,6 % de rappel à 0,1 % de faux positifs sur le test d'origine, contre 80,9 % avant. L'intervalle ne couvre que le tirage du test, pas la variabilité de l'entraînement.

## Modèle retenu : D

- **Pourquoi pas B.** B ne fait plus aucune erreur sur les sites `.sn` légitimes, mais il a appris « `.sn` = légitime » : il ne détecte plus que 8,5 % du phishing réhébergé en `.sn` au seuil « 90 % ». Il faut se méfier d'une mesure trop belle quand on change la distribution d'entraînement.
- **Pourquoi D.** En réhébergeant 3 000 phishing réels de la période d'entraînement en `.sn` (augmentation, entraînement seulement), le modèle apprend que l'extension est neutre. D respecte les critères fixés avant l'entraînement : au plus 3 % de faux positifs au seuil « 90 % » sur les sites `.sn` tenus à l'écart (0,3 %) et au plus 0,5 % au seuil « 80 % » (0 %) ; AUC d'au moins 0,98 (0,9846) ; faux positifs au seuil « 90 % » du test d'origine dans l'intervalle de l'ancien modèle (1,45 %).
- **Pourquoi pas E.** Plus d'augmentation détecte mieux le phishing en `.sn` (72 %), mais fait remonter les faux positifs sur les sites `.sn` tenus à l'écart à 4,4 %, au-delà du critère.

## Ce que le modèle retenu ne sait toujours pas faire

- **Phishing hébergé en `.sn`** : 60 % de détection au seuil « 90 % » (88 % au seuil « 95 % »), contre 90 % pour le phishing d'origine. Une adresse en `.sn` reste plus difficile à juger sur sa seule forme.
- **Marques absentes de la liste** : comme `wikipedla.org`, les imitations de Senelec et de SEN'EAU (tenues hors de la liste pour l'ablation) ne sont pas détectées. L'ancien modèle et la variante A semblaient détecter `sen-eau.sn`, mais pour une mauvaise raison : toute adresse en `.sn` leur paraissait suspecte, y compris le vrai site (0,61). La détection des imitations locales repose sur la liste `MARQUES_SN`, à compléter quand une marque est vérifiée.
- **Peu de vrai phishing sénégalais** : 43 URL de phishing réelles en `.sn` dans tout le corpus. Les imitations de marques locales sont apprises surtout à partir de typosquats synthétiques ; le rappel réel sur les arnaques locales ne pourra être mesuré qu'avec les signalements (V2).
- **Seuil « 95 % »** : 14,5 % de faux positifs sur les sites `.sn` tenus à l'écart. Il reste réservé aux détails pour analyste ; la page n'affiche que les seuils « 80 % » et « 90 % ».

## Reproduire

```powershell
python collect.py          # corpus d'origine (data/corpus.csv)
python ajout_sn.py         # + pages .sn légitimes (Common Crawl) et typosquats des marques sénégalaises
python augmenter_sn.py     # + 3 000 phishing réels réhébergés en .sn (entraînement seulement)
python train.py --corpus data/corpus_sn_aug.csv
python mesure_sn.py --corpus data/corpus_sn_aug.csv
```
