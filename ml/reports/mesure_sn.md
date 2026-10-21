# Faux positifs sur des sites sénégalais légitimes

Généré par `ml/mesure_sn.py` le 2026-10-21, avec le modèle publié (seuils fixés en validation, jamais ajustés ici). Population : les domaines en `.sn` de la liste Tranco, leur page d'accueil et jusqu'à 15 pages de leur sitemap. Intervalles de confiance de Wilson.

### Domaines jamais vus à l'entraînement

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 62 | 318 | 4 (1,26 %, IC 95 % 0,49 % – 3,19 %) | 55 (17,30 %, IC 95 % 13,54 % – 21,84 %) | 163 (51,26 %, IC 95 % 45,78 % – 56,70 %) |
| Pages d'accueil | 62 | 64 | 0 (0,00 %, IC 95 % 0,00 % – 5,66 %) | 0 (0,00 %, IC 95 % 0,00 % – 5,66 %) | 5 (7,81 %, IC 95 % 3,38 % – 17,02 %) |
| Suffixe `sn` | 56 | 311 | 4 (1,29 %, IC 95 % 0,50 % – 3,26 %) | 55 (17,68 %, IC 95 % 13,85 % – 22,31 %) | 162 (52,09 %, IC 95 % 46,55 % – 57,58 %) |
| Suffixe `gouv.sn` | 5 | 5 | 0 (0,00 %, IC 95 % 0,00 % – 43,45 %) | 0 (0,00 %, IC 95 % 0,00 % – 43,45 %) | 1 (20,00 %, IC 95 % 3,62 % – 62,45 %) |
| Suffixe `edu.sn` | 1 | 2 | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) |

### Domaines déjà présents dans le corpus d'entraînement (pour mémoire)

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 2 | 17 | 0 (0,00 %, IC 95 % 0,00 % – 18,43 %) | 0 (0,00 %, IC 95 % 0,00 % – 18,43 %) | 9 (52,94 %, IC 95 % 30,96 % – 73,84 %) |

### Diagnostic

- L'extension `sn` est absente du vocabulaire des TLD du modèle : elle tombe dans la case des extensions rares, que le corpus associe surtout au phishing.
- Mêmes pages avec le code de `.com`, rien d'autre ne change : 55 → 8 faux positifs au seuil « 90 % », 163 → 19 au seuil « 95 % ».
- 14 des 55 faux positifs au seuil « 90 % » ont l'attribut « nom de marque hors de son vrai domaine » : la liste de marques ne connaît que les domaines français (par exemple `orange.fr`, pas `orange.sn`).
- Correction prévue : ajouter des sites `.sn` légitimes et les marques sénégalaises au corpus, réentraîner, puis refaire cette mesure sur des domaines tenus à l'écart de l'entraînement.

### Domaines les plus souvent signalés à tort (seuil « 90 % de rappel »)

- `orange.sn` : 13 page(s)
- `radio.sn` : 12 page(s)
- `1xbet.sn` : 10 page(s)
- `decathlon.sn` : 5 page(s)
- `arc.sn` : 4 page(s)
- `dsi.sn` : 3 page(s)
- `senemarket.sn` : 2 page(s)
- `unchk.sn` : 1 page(s)
- `mojabet.sn` : 1 page(s)
- `uasz.sn` : 1 page(s)
- `auchan.sn` : 1 page(s)
- `groupeism.sn` : 1 page(s)
- `presidence.sn` : 1 page(s)

Limites : Tranco ne classe qu'une partie des sites sénégalais (beaucoup sont en `.com`) ; un site très visité n'est pas forcément sain ; les pages de sitemap sont tirées au hasard.
