# Faux positifs sur des sites sénégalais légitimes

Généré par `ml/mesure_sn.py` le 2026-10-21, avec le modèle de `ml/models/` (seuils fixés en validation, jamais ajustés ici). Population : les domaines en `.sn` de la liste Tranco, leur page d'accueil et jusqu'à 15 pages de leur sitemap. Intervalles de confiance de Wilson.

### Domaines jamais vus à l'entraînement

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 62 | 318 | 0 (0,00 %, IC 95 % 0,00 % – 1,19 %) | 1 (0,31 %, IC 95 % 0,06 % – 1,76 %) | 46 (14,47 %, IC 95 % 11,02 % – 18,76 %) |
| Pages d'accueil | 62 | 64 | 0 (0,00 %, IC 95 % 0,00 % – 5,66 %) | 1 (1,56 %, IC 95 % 0,28 % – 8,33 %) | 40 (62,50 %, IC 95 % 50,25 % – 73,33 %) |
| Suffixe `sn` | 56 | 311 | 0 (0,00 %, IC 95 % 0,00 % – 1,22 %) | 1 (0,32 %, IC 95 % 0,06 % – 1,80 %) | 45 (14,47 %, IC 95 % 10,99 % – 18,81 %) |
| Suffixe `gouv.sn` | 5 | 5 | 0 (0,00 %, IC 95 % 0,00 % – 43,45 %) | 0 (0,00 %, IC 95 % 0,00 % – 43,45 %) | 1 (20,00 %, IC 95 % 3,62 % – 62,45 %) |
| Suffixe `edu.sn` | 1 | 2 | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) | 0 (0,00 %, IC 95 % 0,00 % – 65,76 %) |

### Domaines déjà présents dans le corpus d'entraînement (pour mémoire)

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 2 | 17 | 0 (0,00 %, IC 95 % 0,00 % – 18,43 %) | 0 (0,00 %, IC 95 % 0,00 % – 18,43 %) | 2 (11,76 %, IC 95 % 3,29 % – 34,34 %) |

### Diagnostic

- L'extension `sn` a le code 8 du vocabulaire des TLD du modèle.
- Mêmes pages avec le code de `.com`, rien d'autre ne change : 1 → 1 faux positifs au seuil « 90 % », 46 → 9 au seuil « 95 % ».
- 1 des 1 faux positifs au seuil « 90 % » ont l'attribut « nom de marque hors de son vrai domaine » : la liste de marques ne connaît pas encore le domaine sénégalais de la marque (par exemple `orange.sn` à côté d'`orange.fr`).
- Pack Sénégal dans la liste de marques (`features.MARQUES_SN`) : `wave.com`, `orange.sn`, `sonatel.sn`, `orange-sonatel.com`, `yas.sn`, `expresso.sn`, `dgid.sn`, `laposte.sn`, `jumia.sn`, `ecobank.com`.

### Domaines les plus souvent signalés à tort (seuil « 90 % de rappel »)

- `passorange.sn` : 1 page(s)

Limites : Tranco ne classe qu'une partie des sites sénégalais (beaucoup sont en `.com`) ; un site très visité n'est pas forcément sain ; les pages de sitemap sont tirées au hasard.
