# Réentraînement avec le pack Sénégal : avant / après

Généré par `ml/comparer_modeles.py` le 2026-10-21. Chaque modèle est recalculé avec son propre code d'attributs (l'ancien est extrait de git, commit `5b3a1fa`). Découpe temporelle (validation du 2026-02-03, test à partir du 2026-06-12), seuils de chaque modèle fixés sur sa validation, intervalles de Wilson.

Règle de choix, appliquée sur la **validation** (le test n'a servi qu'à rapporter) : parmi les quatre candidats du pack Sénégal (B à E), celui qui détecte le plus de phishing réhébergé en `.sn` au seuil « 90 % », à condition de rester sous 3 % de faux positifs au seuil « 90 % » sur les pages `.sn` légitimes et sur les pages d'accueil en `www.` de la validation. Elle a été fixée après les résultats de la première version (le seuil de 3 % reprend son critère), et la validation sert aussi à l'arrêt précoce, à la calibration et aux seuils : ses taux sont optimistes, ceux du test font foi.

## 1. Validation (choix de la variante)

### Pages `.sn` légitimes de la validation

347 pages Common Crawl.

| Modèle | Faux positifs au seuil « 80 % » | Faux positifs au seuil « 90 % » |
| --- | --- | --- |
| Ancien modèle (publié) | 38 / 347 (10,95 %, IC 8,08 % – 14,67 %) | 150 / 347 (43,23 %, IC 38,12 % – 48,49 %) |
| A, marques seules | 41 / 347 (11,82 %, IC 8,83 % – 15,64 %) | 144 / 347 (41,50 %, IC 36,43 % – 46,75 %) |
| W, correctif www seul | 102 / 347 (29,39 %, IC 24,85 % – 34,39 %) | 240 / 347 (69,16 %, IC 64,12 % – 73,79 %) |
| B, pack .sn + www (retenu) | 0 / 347 (0,00 %, IC 0,00 % – 1,09 %) | 0 / 347 (0,00 %, IC 0,00 % – 1,09 %) |
| C, B + 1 500 réhébergés | 0 / 347 (0,00 %, IC 0,00 % – 1,09 %) | 16 / 347 (4,61 %, IC 2,86 % – 7,36 %) |
| D, B + 3 000 réhébergés | 1 / 347 (0,29 %, IC 0,05 % – 1,61 %) | 27 / 347 (7,78 %, IC 5,40 % – 11,08 %) |
| E, B + 5 000 réhébergés | 4 / 347 (1,15 %, IC 0,45 % – 2,93 %) | 40 / 347 (11,53 %, IC 8,58 % – 15,32 %) |

### Pages d'accueil légitimes en `www.` de la validation

6914 pages.

| Modèle | Faux positifs au seuil « 80 % » | Faux positifs au seuil « 90 % » |
| --- | --- | --- |
| Ancien modèle (publié) | 5714 / 6914 (82,64 %, IC 81,73 % – 83,52 %) | 6501 / 6914 (94,03 %, IC 93,44 % – 94,56 %) |
| A, marques seules | 5680 / 6914 (82,15 %, IC 81,23 % – 83,04 %) | 6467 / 6914 (93,53 %, IC 92,93 % – 94,09 %) |
| W, correctif www seul | 16 / 6914 (0,23 %, IC 0,14 % – 0,38 %) | 214 / 6914 (3,10 %, IC 2,71 % – 3,53 %) |
| B, pack .sn + www (retenu) | 9 / 6914 (0,13 %, IC 0,07 % – 0,25 %) | 187 / 6914 (2,70 %, IC 2,35 % – 3,11 %) |
| C, B + 1 500 réhébergés | 13 / 6914 (0,19 %, IC 0,11 % – 0,32 %) | 196 / 6914 (2,83 %, IC 2,47 % – 3,25 %) |
| D, B + 3 000 réhébergés | 11 / 6914 (0,16 %, IC 0,09 % – 0,28 %) | 203 / 6914 (2,94 %, IC 2,56 % – 3,36 %) |
| E, B + 5 000 réhébergés | 11 / 6914 (0,16 %, IC 0,09 % – 0,28 %) | 208 / 6914 (3,01 %, IC 2,63 % – 3,44 %) |

### Phishing de la validation réhébergé en `.sn`

14081 URL.

| Modèle | Rappel au seuil « 80 % » | Rappel au seuil « 90 % » | Rappel au seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 61,2 % | 84,8 % | 91,0 % |
| A, marques seules | 62,2 % | 84,7 % | 91,1 % |
| W, correctif www seul | 56,4 % | 78,6 % | 90,8 % |
| B, pack .sn + www (retenu) | 4,9 % | 11,6 % | 22,7 % |
| C, B + 1 500 réhébergés | 32,7 % | 63,8 % | 91,5 % |
| D, B + 3 000 réhébergés | 46,7 % | 81,1 % | 95,9 % |
| E, B + 5 000 réhébergés | 53,5 % | 88,0 % | 97,5 % |

**Variante retenue par la règle : B, pack .sn + www (retenu).**

## 2. Test (rapporté, jamais utilisé pour choisir)

### Test temporel d'origine

Même population que l'ancien rapport : 28094 phishing sur des domaines jamais vus, 16566 légitimes (pages d'accueil sans `www.`, comme le corpus d'origine).

| Modèle | AUC | Rappel à 0,1 % de FP | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |
| --- | --- | --- | --- | --- | --- |
| Ancien modèle (publié) | 0,9849 | 80,9 % | 0,16 % [0,11 % – 0,23 %], rappel 82,1 % | 1,38 % [1,22 % – 1,57 %], rappel 90,0 % | 7,05 % [6,67 % – 7,45 %], rappel 94,6 % |
| A, marques seules | 0,9849 | 81,3 % | 0,12 % [0,08 % – 0,19 %], rappel 82,1 % | 1,44 % [1,27 % – 1,64 %], rappel 90,2 % | 7,11 % [6,73 % – 7,51 %], rappel 94,7 % |
| W, correctif www seul | 0,9762 | 74,1 % | 0,56 % [0,46 % – 0,69 %], rappel 80,3 % | 3,37 % [3,11 % – 3,66 %], rappel 89,9 % | 15,56 % [15,01 % – 16,12 %], rappel 95,5 % |
| B, pack .sn + www (retenu) | 0,9759 | 74,3 % | 0,51 % [0,42 % – 0,63 %], rappel 79,8 % | 3,60 % [3,32 % – 3,89 %], rappel 89,6 % | 14,73 % [14,20 % – 15,28 %], rappel 95,2 % |
| C, B + 1 500 réhébergés | 0,9763 | 74,5 % | 0,49 % [0,39 % – 0,61 %], rappel 79,6 % | 3,25 % [2,99 % – 3,53 %], rappel 89,7 % | 14,25 % [13,72 % – 14,79 %], rappel 95,3 % |
| D, B + 3 000 réhébergés | 0,9758 | 74,4 % | 0,53 % [0,43 % – 0,65 %], rappel 79,6 % | 4,18 % [3,89 % – 4,50 %], rappel 89,8 % | 14,78 % [14,25 % – 15,33 %], rappel 95,3 % |
| E, B + 5 000 réhébergés | 0,9761 | 73,6 % | 0,51 % [0,42 % – 0,63 %], rappel 79,4 % | 3,27 % [3,01 % – 3,55 %], rappel 89,7 % | 14,46 % [13,93 % – 15,00 %], rappel 95,2 % |

### Seuils de chaque modèle (fixés sur sa validation)

Corriger l'artefact retire du phishing « facile » : pour garder 90 % de rappel, le seuil « 90 % » descend, et toutes les pages légitimes en paient le prix.

| Modèle | Seuil « 80 % » | Seuil « 90 % » | Seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 0,924 | 0,677 | 0,273 |
| A, marques seules | 0,923 | 0,679 | 0,263 |
| W, correctif www seul | 0,887 | 0,546 | 0,197 |
| B, pack .sn + www (retenu) | 0,902 | 0,558 | 0,214 |
| C, B + 1 500 réhébergés | 0,901 | 0,566 | 0,212 |
| D, B + 3 000 réhébergés | 0,898 | 0,559 | 0,207 |
| E, B + 5 000 réhébergés | 0,892 | 0,548 | 0,206 |

### Pages légitimes du test, par source

Faux positifs au seuil « 90 % » (niveau « Douteux » de la page Vérifier), puis au seuil « 80 % » (« Arnaque probable »).

| Source | Pages | Ancien modèle (publié) | A, marques seules | W, correctif www seul | B, pack .sn + www (retenu) | C, B + 1 500 réhébergés | D, B + 3 000 réhébergés | E, B + 5 000 réhébergés |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pages profondes de sites français (`sitemap-fr`, en `www.`) | 2326 | 1,4 % / 0,3 % | 1,3 % / 0,0 % | 5,1 % / 0,6 % | 8,3 % / 0,6 % | 5,0 % / 0,6 % | 11,9 % / 0,4 % | 4,6 % / 0,6 % |
| Pages profondes de sites internationaux (`sitemap-intl`) | 829 | 0,1 % / 0,0 % | 0,1 % / 0,0 % | 0,5 % / 0,0 % | 0,4 % / 0,0 % | 0,6 % / 0,0 % | 0,6 % / 0,0 % | 0,6 % / 0,0 % |
| Pages d'accueil sans `www.` (`tranco-accueil`) | 13411 | 1,5 % / 0,1 % | 1,6 % / 0,1 % | 3,3 % / 0,6 % | 3,0 % / 0,5 % | 3,1 % / 0,5 % | 3,1 % / 0,6 % | 3,2 % / 0,5 % |
| Pages d'accueil en `www.` (dérivées) | 13411 | 94,4 % / 83,1 % | 94,2 % / 83,0 % | 1,9 % / 0,2 % | 1,7 % / 0,2 % | 1,7 % / 0,2 % | 1,7 % / 0,2 % | 1,7 % / 0,3 % |
| Pages `.sn` (Common Crawl) | 1288 | 42,0 % / 8,2 % | 38,4 % / 8,7 % | 67,3 % / 27,6 % | 3,0 % / 2,5 % | 4,0 % / 0,9 % | 7,6 % / 1,5 % | 12,4 % / 2,0 % |

### Pages d'accueil légitimes en `www.` du test

13451 pages : ce que le test d'origine ne voyait pas.

| Modèle | Faux positifs au seuil « 80 % » | Faux positifs au seuil « 90 % » | Faux positifs au seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 11185 / 13451 (83,15 %, IC 82,51 % – 83,78 %) | 12694 / 13451 (94,37 %, IC 93,97 % – 94,75 %) | 13252 / 13451 (98,52 %, IC 98,30 % – 98,71 %) |
| A, marques seules | 11172 / 13451 (83,06 %, IC 82,41 % – 83,68 %) | 12671 / 13451 (94,20 %, IC 93,79 % – 94,58 %) | 13179 / 13451 (97,98 %, IC 97,73 % – 98,20 %) |
| W, correctif www seul | 27 / 13451 (0,20 %, IC 0,14 % – 0,29 %) | 249 / 13451 (1,85 %, IC 1,64 % – 2,09 %) | 1087 / 13451 (8,08 %, IC 7,63 % – 8,55 %) |
| B, pack .sn + www (retenu) | 25 / 13451 (0,19 %, IC 0,13 % – 0,27 %) | 222 / 13451 (1,65 %, IC 1,45 % – 1,88 %) | 985 / 13451 (7,32 %, IC 6,89 % – 7,78 %) |
| C, B + 1 500 réhébergés | 30 / 13451 (0,22 %, IC 0,16 % – 0,32 %) | 228 / 13451 (1,70 %, IC 1,49 % – 1,93 %) | 1012 / 13451 (7,52 %, IC 7,09 % – 7,98 %) |
| D, B + 3 000 réhébergés | 33 / 13451 (0,25 %, IC 0,17 % – 0,34 %) | 231 / 13451 (1,72 %, IC 1,51 % – 1,95 %) | 1023 / 13451 (7,61 %, IC 7,17 % – 8,07 %) |
| E, B + 5 000 réhébergés | 35 / 13451 (0,26 %, IC 0,19 % – 0,36 %) | 234 / 13451 (1,74 %, IC 1,53 % – 1,97 %) | 1029 / 13451 (7,65 %, IC 7,21 % – 8,11 %) |

### Pages `.sn` légitimes du test

1288 pages Common Crawl de 164 domaines, jamais vues à l'entraînement.

| Modèle | Faux positifs au seuil « 80 % » | Faux positifs au seuil « 90 % » | Faux positifs au seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 106 / 1288 (8,23 %, IC 6,85 % – 9,86 %) | 541 / 1288 (42,00 %, IC 39,34 % – 44,72 %) | 977 / 1288 (75,85 %, IC 73,44 % – 78,11 %) |
| A, marques seules | 112 / 1288 (8,70 %, IC 7,28 % – 10,36 %) | 495 / 1288 (38,43 %, IC 35,81 % – 41,12 %) | 968 / 1288 (75,16 %, IC 72,72 % – 77,44 %) |
| W, correctif www seul | 356 / 1288 (27,64 %, IC 25,27 % – 30,15 %) | 867 / 1288 (67,31 %, IC 64,70 % – 69,82 %) | 1210 / 1288 (93,94 %, IC 92,51 % – 95,12 %) |
| B, pack .sn + www (retenu) | 32 / 1288 (2,48 %, IC 1,77 % – 3,49 %) | 39 / 1288 (3,03 %, IC 2,22 % – 4,11 %) | 48 / 1288 (3,73 %, IC 2,82 % – 4,91 %) |
| C, B + 1 500 réhébergés | 12 / 1288 (0,93 %, IC 0,53 % – 1,62 %) | 51 / 1288 (3,96 %, IC 3,02 % – 5,17 %) | 197 / 1288 (15,30 %, IC 13,43 % – 17,36 %) |
| D, B + 3 000 réhébergés | 19 / 1288 (1,48 %, IC 0,95 % – 2,29 %) | 98 / 1288 (7,61 %, IC 6,28 % – 9,19 %) | 307 / 1288 (23,84 %, IC 21,59 % – 26,24 %) |
| E, B + 5 000 réhébergés | 26 / 1288 (2,02 %, IC 1,38 % – 2,94 %) | 160 / 1288 (12,42 %, IC 10,73 % – 14,34 %) | 386 / 1288 (29,97 %, IC 27,53 % – 32,53 %) |

### Phishing du test réhébergé en `.sn`

13265 URL réelles du test, extension remplacée par `.sn` ou `.com.sn` : un substitut, faute de vrai phishing `.sn` (43 URL dans tout le corpus).

| Modèle | Rappel au seuil « 80 % » | Rappel au seuil « 90 % » | Rappel au seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 61,6 % | 79,7 % | 87,8 % |
| A, marques seules | 62,5 % | 79,4 % | 88,0 % |
| W, correctif www seul | 52,8 % | 73,3 % | 88,9 % |
| B, pack .sn + www (retenu) | 5,2 % | 14,8 % | 27,1 % |
| C, B + 1 500 réhébergés | 35,5 % | 64,6 % | 89,0 % |
| D, B + 3 000 réhébergés | 46,5 % | 80,0 % | 93,7 % |
| E, B + 5 000 réhébergés | 52,9 % | 86,4 % | 95,8 % |

### Les sites `.sn` de `mesure_sn_domaines.txt` absents du corpus

380 pages : pages de sitemap et pages d'accueil sous les deux formes. Ces sites ont servi à découvrir le problème et à régler les premières variantes : chiffres indicatifs.

| Modèle | Faux positifs au seuil « 80 % » | Faux positifs au seuil « 90 % » | Faux positifs au seuil « 95 % » |
| --- | --- | --- | --- |
| Ancien modèle (publié) | 56 / 380 (14,74 %, IC 11,53 % – 18,65 %) | 117 / 380 (30,79 %, IC 26,36 % – 35,60 %) | 225 / 380 (59,21 %, IC 54,20 % – 64,04 %) |
| A, marques seules | 53 / 380 (13,95 %, IC 10,82 % – 17,79 %) | 109 / 380 (28,68 %, IC 24,37 % – 33,43 %) | 213 / 380 (56,05 %, IC 51,03 % – 60,96 %) |
| W, correctif www seul | 20 / 380 (5,26 %, IC 3,43 % – 7,99 %) | 117 / 380 (30,79 %, IC 26,36 % – 35,60 %) | 265 / 380 (69,74 %, IC 64,94 % – 74,14 %) |
| B, pack .sn + www (retenu) | 0 / 380 (0,00 %, IC 0,00 % – 1,00 %) | 0 / 380 (0,00 %, IC 0,00 % – 1,00 %) | 5 / 380 (1,32 %, IC 0,56 % – 3,04 %) |
| C, B + 1 500 réhébergés | 0 / 380 (0,00 %, IC 0,00 % – 1,00 %) | 8 / 380 (2,11 %, IC 1,07 % – 4,10 %) | 78 / 380 (20,53 %, IC 16,77 % – 24,87 %) |
| D, B + 3 000 réhébergés | 0 / 380 (0,00 %, IC 0,00 % – 1,00 %) | 38 / 380 (10,00 %, IC 7,37 % – 13,43 %) | 136 / 380 (35,79 %, IC 31,13 % – 40,73 %) |
| E, B + 5 000 réhébergés | 1 / 380 (0,26 %, IC 0,05 % – 1,48 %) | 63 / 380 (16,58 %, IC 13,18 % – 20,65 %) | 153 / 380 (40,26 %, IC 35,45 % – 45,27 %) |

## 3. Ablation (seuil « 90 % » de chaque modèle, * = classé phishing)

| Domaine | Ancien modèle (publié) : vrai / imitation | A, marques seules : vrai / imitation | W, correctif www seul : vrai / imitation | B, pack .sn + www (retenu) : vrai / imitation | C, B + 1 500 réhébergés : vrai / imitation | D, B + 3 000 réhébergés : vrai / imitation | E, B + 5 000 réhébergés : vrai / imitation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LetsDefend | 0,86* / 0,86* | 0,89* / 0,89* | 0,82* / 0,82* | 0,81* / 0,81* | 0,84* / 0,84* | 0,83* / 0,83* | 0,81* / 0,81* |
| GitHub | 0,51 / 0,97* | 0,51 / 0,98* | 0,68* / 0,98* | 0,65* / 0,98* | 0,60* / 0,98* | 0,68* / 0,98* | 0,64* / 0,98* |
| impots.gouv.fr | 0,02 / 0,99* | 0,01 / 0,99* | 0,03 / 1,00* | 0,03 / 1,00* | 0,03 / 1,00* | 0,02 / 1,00* | 0,03 / 1,00* |
| Google | 0,14 / 0,97* | 0,12 / 0,93* | 0,34 / 0,98* | 0,35 / 0,99* | 0,44 / 0,99* | 0,29 / 0,99* | 0,29 / 0,98* |
| Wikipedia | 0,04 / 0,04 | 0,05 / 0,06 | 0,04 / 0,06 | 0,05 / 0,06 | 0,05 / 0,06 | 0,05 / 0,06 | 0,05 / 0,05 |
| service-public | 0,05 / 0,99* | 0,05 / 1,00* | 0,03 / 1,00* | 0,03 / 1,00* | 0,04 / 1,00* | 0,04 / 1,00* | 0,04 / 1,00* |
| Senelec | 0,60 / 0,58 | 0,61 / 0,55 | 0,77* / 0,75* | 0,00 / 0,00 | 0,13 / 0,12 | 0,18 / 0,16 | 0,16 / 0,15 |
| SEN'EAU | 0,61 / 0,75* | 0,61 / 0,78* | 0,69* / 0,74* | 0,00 / 0,00 | 0,04 / 0,18 | 0,06 / 0,22 | 0,08 / 0,37 |

## 4. Ce que ce réentraînement a montré

**Un artefact de collecte gonflait les métriques publiées.** Les 57 916 pages d'accueil légitimes du corpus d'origine venaient des listes Tranco, écrites `https://domaine/` : 6 seulement commençaient par `www.`, contre des dizaines de milliers d'URL de phishing. L'ancien modèle avait appris « page d'accueil en `www.` = phishing » : 94 % des pages d'accueil légitimes en `www.` du test étaient classées au seuil « 90 % », 83 % au seuil « 80 % ». Le test d'origine partageait l'artefact, aucune métrique ne pouvait le voir. `accueils_www.py` ajoute la forme `www.` de chaque page d'accueil légitime : le modèle retenu en classe à tort 1,7 % au seuil « 90 % ».

**Le prix de la correction.** Une partie du phishing n'était « facile » qu'à cause de l'artefact. Pour garder 90 % de rappel sans lui, le seuil « 90 % » descend de 0,68 à 0,56, et toutes les pages légitimes en paient le prix (section 2, « par source ») : sur le test d'origine, 3,6 % de faux positifs au seuil « 90 % » et 0,51 % au seuil « 80 % », contre 1,38 % et 0,16 % annoncés avant ; 74 % de rappel à 0,1 % de faux positifs, contre 81 %. **Les pages profondes des sites français** (toutes en `www.`) sont les plus touchées : 8,3 % de faux positifs au niveau « Douteux », contre 1,4 % avant (0,6 % contre 0,3 % au niveau « Arnaque probable »). Ce ne sont pas des pages d'accueil, et le seuil plus bas n'explique qu'une partie de la hausse : au seuil de l'ancien modèle (0,68), le nouveau en classe encore 4,6 % ; le reste vient d'un changement de ses scores. Ce taux est aussi instable d'une variante à l'autre (de 4,6 % à 11,9 % selon les variantes W à E) : à surveiller au prochain entraînement. Une partie des anciens chiffres était donc trop belle, une autre est une vraie régression, assumée parce que l'ancien modèle se trompait sur 94 % des pages d'accueil en `www.`.

**Les sites sénégalais légitimes sont beaucoup moins souvent pris pour du phishing.** Sur les pages `.sn` légitimes du test, les faux positifs au seuil « 90 % » passent de 42 % à 3,0 % ; sur les sites de la mesure, de 31 % à 0 % (indicatif : ces sites ont servi à découvrir le problème).

**Le revers, choisi en connaissance de cause.** Sans phishing en `.sn` pour équilibrer, le modèle retenu ne détecte que 15 % du phishing réhébergé en `.sn` au seuil « 90 % » (80 % pour l'ancien). Réhéberger du phishing réel en `.sn` à l'entraînement (variantes C à E) relève cette détection jusqu'à 86 %, mais fait remonter les faux positifs sur les pages `.sn` légitimes de la validation au-delà de 3 % : la règle, fixée sur la validation après la première version, écarte ces variantes. Sur le test, B est lui-même tout juste à 3,0 % : la marge est mince. Les taux de base vont dans le même sens : 43 URL de phishing en `.sn` dans tout le corpus, alors que les liens `.sn` légitimes sont courants au Sénégal. Un escroc qui enregistre un domaine `.sn` a donc de bonnes chances de passer : c'est écrit dans le modèle de menaces et sur la page « Vérifier ». La variante D reste disponible si l'on préfère la détection à la tranquillité des sites légitimes.

**L'écart entre découpe aléatoire et découpe temporelle dépend de la construction du corpus.**

| Corpus et code | Aléatoire | Temporelle | Écart [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Corpus d'origine, ancien code | 92,5 % | 54,0 % | 38,5 points [37,6 – 39,4] |
| Corpus d'origine, code du pack Sénégal | 92,7 % | 45,1 % | 47,5 points [46,6 – 48,2] |
| Corpus avec pages `.sn` et 3 000 réhébergés (variante D) | 92,4 % | 42,6 % | 49,7 points [49,0 – 50,6] |
| **Corpus final (pages `.sn` et pages d'accueil en `www.`)** | 89,6 % | 54,8 % | **34,7 points** [32,4 – 35,8] |

Les intervalles ne couvrent que le tirage du test, pas la variabilité de l'entraînement ni celle de la construction du corpus, qui est bien plus grande : selon la version, l'écart va de 35 à 50 points. La conclusion ne change pas : une découpe aléatoire surestime massivement la capacité à détecter des campagnes nouvelles. Le chiffre exact n'est pas une constante, et le projet le publie désormais comme une fourchette. Pour la variante sans TLD, l'écart vaut 15,9 points [15,0 – 18,2] sur le corpus final (16,0 publié avant).

**Le CNN fait mieux au test global, mais pas là où ça compte.** Sur le test final, le CNN sur caractères obtient une AUC de 0,986 et 1,6 % de faux positifs au seuil « 90 % », contre 0,981 et 2,7 % pour LightGBM. Il ne détecte toujours aucun typosquat de l'ablation (`googIe`, `githib`, `impots-gouv`…), et il ne tourne pas dans le navigateur. LightGBM reste le modèle publié.

**Un modèle plus lourd.** L'arrêt précoce retient 668 arbres au lieu de 246 : 2,2 Mo exportés pour le site, environ 920 Ko compressés, téléchargés une fois. Avec un processeur ralenti six fois (test Playwright), le test exige moins d'une seconde en médiane pour le verdict et son affichage ; on mesure de 0,2 à 0,7 s selon la charge de la machine.

**Limites relevées par l'ablation.** La page de connexion de GitHub passe au-dessus du seuil « 90 % » (0,65 pour un seuil de 0,56) et `letsdefend.io` reste un faux positif ; les imitations de Senelec et de SEN'EAU, marques volontairement hors de la liste, ne sont pas détectées. Les pages `.sn` de Common Crawl sont étiquetées légitimes sans vérification de réputation.

## 5. Reproduire

```powershell
python collect.py          # corpus d'origine (data/corpus.csv)
python ajout_sn.py         # + pages .sn légitimes (Common Crawl) et typosquats des marques sénégalaises -> corpus_sn.csv
python accueils_www.py     # + forme www. des pages d'accueil légitimes -> corpus_sn_www.csv
python train.py --corpus data/corpus_sn_www.csv                     # modèle publié (B)
python train.py --corpus data/corpus_sn_www.csv --comparaison-seule # reports/comparaison_decoupes.md
python mesure_sn.py --corpus data/corpus_sn_www.csv
# variantes : accueils_www.py --corpus data/corpus.csv --sortie data/corpus_www.csv (W),
# augmenter_sn.py --nombre 1500|3000|5000 --sortie data/corpus_w_aug<n>.csv (C, D, E),
# puis train.py --corpus <fichier> --sortie <nom> --sans-cnn --sans-aleatoire, et :
python comparer_modeles.py --ancien 5b3a1fa --variantes sn_marques:A w_www:W final:B w_aug1500:C w_aug3000:D w_aug5000:E --candidats final w_aug1500 w_aug3000 w_aug5000
```
