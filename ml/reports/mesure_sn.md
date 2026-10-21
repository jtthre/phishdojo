# Faux positifs sur des sites sénégalais légitimes

Généré par `ml/mesure_sn.py` le 2026-10-21, avec le modèle de `ml/models/` (seuils fixés en validation, jamais ajustés ici). Population : les domaines en `.sn` de la liste Tranco, leur page d'accueil et jusqu'à 15 pages de leur sitemap. Intervalles de confiance de Wilson.

### Domaines jamais vus à l'entraînement

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 62 | 380 | 0 (0,00 %, IC 95 % 0,00 % – 1,00 %) | 0 (0,00 %, IC 95 % 0,00 % – 1,00 %) | 5 (1,32 %, IC 95 % 0,56 % – 3,04 %) |
| Pages d'accueil https://domaine/ | 62 | 64 | 0 (0,00 %, IC 95 % 0,00 % – 5,66 %) | 0 (0,00 %, IC 95 % 0,00 % – 5,66 %) | 1 (1,56 %, IC 95 % 0,28 % – 8,33 %) |
| Pages d'accueil https://www.domaine/ | 62 | 62 | 0 (0,00 %, IC 95 % 0,00 % – 5,83 %) | 0 (0,00 %, IC 95 % 0,00 % – 5,83 %) | 1 (1,61 %, IC 95 % 0,29 % – 8,59 %) |
| Suffixe `sn` | 56 | 367 | 0 (0,00 %, IC 95 % 0,00 % – 1,04 %) | 0 (0,00 %, IC 95 % 0,00 % – 1,04 %) | 5 (1,36 %, IC 95 % 0,58 % – 3,15 %) |
| Suffixe `gouv.sn` | 5 | 10 | 0 (0,00 %, IC 95 % 0,00 % – 27,75 %) | 0 (0,00 %, IC 95 % 0,00 % – 27,75 %) | 0 (0,00 %, IC 95 % 0,00 % – 27,75 %) |
| Suffixe `edu.sn` | 1 | 3 | 0 (0,00 %, IC 95 % 0,00 % – 56,15 %) | 0 (0,00 %, IC 95 % 0,00 % – 56,15 %) | 0 (0,00 %, IC 95 % 0,00 % – 56,15 %) |

### Domaines déjà présents dans le corpus d'entraînement (pour mémoire)

| Population | Domaines | Pages | Faux positifs au seuil « 80 % de rappel » | Faux positifs au seuil « 90 % de rappel » | Faux positifs au seuil « 95 % de rappel » |
| --- | --- | --- | --- | --- | --- |
| Toutes les pages | 2 | 19 | 0 (0,00 %, IC 95 % 0,00 % – 16,82 %) | 0 (0,00 %, IC 95 % 0,00 % – 16,82 %) | 0 (0,00 %, IC 95 % 0,00 % – 16,82 %) |

### Diagnostic

- L'extension `sn` a le code 15 du vocabulaire des TLD du modèle.
- Mêmes pages avec le code de `.com`, rien d'autre ne change : 0 → 6 faux positifs au seuil « 90 % », 5 → 33 au seuil « 95 % ».
- 0 des 0 faux positifs au seuil « 90 % » ont l'attribut « nom de marque hors de son vrai domaine ».
- Pack Sénégal dans la liste de marques (`features.MARQUES_SN`) : `wave.com`, `orange.sn`, `sonatel.sn`, `orange-sonatel.com`, `yas.sn`, `expresso.sn`, `dgid.sn`, `laposte.sn`, `jumia.sn`, `ecobank.com`.

### Domaines les plus souvent signalés à tort (seuil « 90 % de rappel »)

Aucun.

Limites : Tranco ne classe qu'une partie des sites sénégalais (beaucoup sont en `.com`) ; un site très visité n'est pas forcément sain ; les pages de sitemap sont tirées au hasard.
