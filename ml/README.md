# Le modèle — détecter le phishing, et mesurer ce que ça coûte

Tout est parti d'un audit. Le détecteur d'URL de phishing le plus téléchargé de Hugging Face annonçait 97 % d'exactitude. Testé sur des cas réels, il classait **le vrai site des impôts comme phishing (1,00)** et laissait passer **`googIe.com`** (un I majuscule à la place du l). Il avait surtout appris la façon dont ses données avaient été collectées, et beaucoup moins le phishing.

J'ai donc entraîné mon propre modèle, avec un protocole pensé pour l'exploitation en SOC plutôt que pour un score flatteur. C'est ce modèle qui fait tourner le vérificateur de PhishDojo, directement dans le navigateur (page `verifier.html`, phase B de la [feuille de route](../README.md#feuille-de-route)) : [voir plus bas](#dans-le-navigateur).

| URL | Modèle public | Mon modèle |
| --- | --- | --- |
| `impots.gouv.fr` (légitime) | 1,00 → bloqué à tort | **0,03** → légitime |
| `googIe.com` (imitation) | 0,00 → ignoré | **0,80** → détecté (« Douteux ») ; `accounts.googIe.com/signin` : **0,99** |

Ce modèle a ensuite été audité à son tour, et ce que j'y ai trouvé est raconté plus bas : un artefact de collecte gonflait en partie ses propres métriques ([reports/reentrainement_sn.md](reports/reentrainement_sn.md)).

## Contenu du dossier

| Fichier | Rôle |
| --- | --- |
| `collect.py` | Construit le corpus : historique daté du flux OpenPhish, jeu `ealvaradob/phishing-dataset`, pages légitimes via sitemaps et Common Crawl, pages d'accueil issues des listes Tranco historiques. |
| `features.py` | Trente attributs lisibles : longueurs, entropie, TLD, hébergeurs gratuits, marques imitées, confusables (`0`/`o`, `I`/`l`, `rn`/`m`). |
| `train.py` | Entraîne LightGBM (attributs) et un CNN sur caractères, calibre les scores, fixe les seuils en validation et génère le rapport. |
| `modeles.py` | Calibration de Platt, CNN, explication SHAP par URL. |
| `ajout_sn.py` | Pack Sénégal : ajoute au corpus des pages `.sn` légitimes datées (Common Crawl) et des typosquats des marques sénégalaises. |
| `accueils_www.py` | Ajoute la forme `www.` de chaque page d'accueil légitime : corrige l'artefact qui faisait passer `https://www.lemonde.fr/` pour du phishing. |
| `augmenter_sn.py` | Réhéberge en `.sn` du phishing réel de la période d'entraînement (variantes C à E, mesurées, non retenues). |
| `comparer_modeles.py` | Avant / après le réentraînement : [reports/reentrainement_sn.md](reports/reentrainement_sn.md). |
| `ablation.py` | Fait varier un seul facteur à la fois (`http`/`https`, orthographe du domaine) sur des domaines absents du corpus. |
| `app.py` | Interface Gradio locale : une URL, un lot étiqueté, ou l'ablation. |
| `exporter_web.py` | Exporte le modèle pour le site (`web/modele/url-lgbm.js`, données seules) et le jeu de référence de la parité (`tests/parite/reference.json`). |
| `parite_web.py` | Compare Python et le moteur du site sur tout le corpus ; écrit `reports/parite_web.md`. |
| `mesure_sn.py` | Faux positifs sur des sites `.sn` légitimes (Tranco, pages d'accueil et sitemaps) ; écrit `reports/mesure_sn.md`. |
| `test_phishing.py` | Audit d'un modèle du Hub sur des cas dont on connaît la nature ([LANCER.md](LANCER.md)). |
| `space/` | La même interface, prête pour un Space Hugging Face. |
| `reports/` | Rapport d'entraînement, métriques, comparaison des découpes. `reports_sans_tld/` : la variante entraînée sans le TLD. |
| `models/` | Modèles entraînés (LightGBM 4,8 Mo, CNN 0,8 Mo) et leurs empreintes `SHA256SUMS`. |

## La question posée

> À quel taux de faux positifs peut-on détecter 90 % du phishing, sur des campagnes que le modèle n'a jamais vues ?

Un analyste SOC ne travaille pas avec une AUC. Il travaille avec un nombre d'alertes par jour. Toutes les métriques sont donc projetées sur **100 000 URL par jour, dont 1 phishing pour 1 000**.

## Protocole

- **Découpe temporelle** : entraînement avant février 2026, validation de février à juin, test après le 12 juin 2026.
- **Domaines nouveaux uniquement au test** : 5 062 URL de phishing retirées parce que leur domaine apparaissait déjà à l'entraînement.
- **Scores calibrés** (Platt) et **seuils choisis en validation**, jamais sur le test.
- **Intervalles de confiance** de Wilson sur chaque taux de faux positifs.
- **Ablation** sur huit domaines absents de tout le corpus : on change un seul facteur à la fois (http/https, vraie orthographe ou typosquat).
- **Premier biais corrigé** : les phishing étaient souvent des domaines nus, alors que tous les légitimes avaient un chemin. Le modèle apprenait « pas de chemin = phishing ». J'ai ajouté des pages d'accueil légitimes tirées des listes Tranco, et un contrôle automatique de cet écart dans `collect.py`.
- **Second biais, trouvé en octobre 2026** : ces pages d'accueil Tranco étaient toutes écrites `https://domaine/`, sans `www.`, alors que le phishing en compte des dizaines de milliers. Le modèle avait appris « page d'accueil en `www.` = phishing » (0,91 pour `https://www.lemonde.fr/`), et le test, construit de la même façon, ne pouvait pas le voir. `accueils_www.py` ajoute la forme `www.` de chaque page d'accueil légitime.

| Ensemble | Phishing | Légitimes |
| --- | --- | --- |
| Entraînement | 216 914 | 142 683 |
| Validation | 23 307 | 15 354 |
| Test | 28 094 | 31 305 |

**Pack Sénégal (octobre 2026).** Le corpus d'origine est conservé ; trois ajouts : 4 396 pages `.sn` légitimes datées (Common Crawl, 537 domaines, réparties entre entraînement, validation et test), 583 typosquats des dix marques sénégalaises vérifiées (`MARQUES_SN`), et la forme `www.` des 58 088 pages d'accueil légitimes. Aucun ajout ne vient des 64 sites `.sn` de la mesure (deux d'entre eux, `sonatel.sn` et `blogspot.sn`, figuraient déjà dans le corpus d'origine et sont comptés à part) ni des deux marques de l'ablation sénégalaise (Senelec, SEN'EAU). Le modèle publié a été choisi parmi quatre candidats (six variantes mesurées) par une règle appliquée sur la validation, fixée après les résultats d'une première version : [reports/reentrainement_sn.md](reports/reentrainement_sn.md).

## Résultats (LightGBM, test temporel)

| Rappel visé | Rappel obtenu | Taux de faux positifs [IC 95 %] | Alertes / jour |
| --- | --- | --- | --- |
| 80 % | 79,8 % | 0,45 % [0,38 – 0,53] | **≈ 530** |
| 90 % | 89,6 % | 2,74 % [2,56 – 2,92] | ≈ 2 820 |
| 95 % | 95,2 % | 11,09 % [10,75 – 11,45] | ≈ 11 180 |

AUC ROC 0,981. Ces chiffres sont nettement moins bons que ceux publiés avant octobre 2026 (≈ 240 alertes par jour à 82 % de rappel, 1,38 % de faux positifs au seuil « 90 % »). Une partie des anciens chiffres profitait de l'artefact `www.` ; une autre partie est une vraie régression : sans le phishing « facile » de l'artefact, le seuil « 90 % » descend de 0,68 à 0,56, et les pages profondes des sites français passent de 1,4 % à 8,3 % de faux positifs au niveau « Douteux ». Sur le test d'origine, sans pages d'accueil en `www.`, le modèle actuel fait 0,51 % de faux positifs au seuil « 80 % » et 3,6 % au seuil « 90 % » ; sur les pages d'accueil légitimes en `www.`, que l'ancien modèle classait à 94 % au seuil « 90 % », il en classe 1,7 %. Le détail est dans [reports/reentrainement_sn.md](reports/reentrainement_sn.md).

Le CNN sur caractères fait mieux au test global (AUC 0,986, 1,6 % de faux positifs au seuil « 90 % ») mais ne détecte aucun typosquat de l'ablation, et il ne tourne pas dans le navigateur. LightGBM reste le modèle retenu.

**Découpe aléatoire contre découpe temporelle** : même LightGBM, mêmes URL datées, seule la façon de tirer le test change. Sur le corpus actuel, une découpe aléatoire annonce 89,6 % de rappel à 0,1 % de faux positifs ; la découpe temporelle donne 54,8 %. **Soit 34,7 points de surestimation**, et encore 15,9 points pour la variante sans TLD, parce que des URL d'une même campagne se retrouvent des deux côtés de la frontière. Ce chiffre dépend de la construction du corpus : selon la version, il est allé de 35 à 50 points (38,5 sur le corpus d'origine). Les intervalles de confiance par bootstrap (32,4 à 35,8 points ici) ne couvrent que le tirage du test, pas cette variabilité-là. La conclusion, elle, ne bouge pas : la plupart des scores publiés sur ce sujet mesurent la mémoire du modèle, pas sa capacité à détecter des campagnes nouvelles.

Détail : [reports/comparaison_decoupes.md](reports/comparaison_decoupes.md) (`python train.py --corpus data/corpus_sn_www.csv --comparaison-seule`), [reports/rapport.md](reports/rapport.md), et l'historique des quatre versions dans [reports/reentrainement_sn.md](reports/reentrainement_sn.md).

## Limites connues

Je les liste parce qu'elles comptent autant que les scores.

- **Le TLD pèse 31,7 % des décisions.** Une partie de ce poids vient de la construction du corpus (légitimes surtout en `.fr`, phishing venu d'un flux mondial). Une variante sans TLD est entraînée pour comparaison (`reports_sans_tld/`) : elle fait 6,7 % de faux positifs au seuil « 90 % ».
- **Sites sénégalais** : avant le pack Sénégal, l'extension `sn` était absente du vocabulaire des TLD et traitée comme une extension rare ; 42 % des pages `.sn` légitimes du test passaient le seuil « 90 % ». Le modèle actuel en classe 3,0 % (0 % sur les sites de [reports/mesure_sn.md](reports/mesure_sn.md), chiffre indicatif : ces sites ont servi à découvrir le problème).
- **Phishing hébergé en `.sn`** : 15 % de détection au seuil « 90 % », contre 90 % pour le phishing d'origine (phishing réel du test réhébergé en `.sn`, faute de vrai phishing `.sn` : 43 URL dans tout le corpus). C'est un angle mort assumé : les variantes qui le réduisaient faisaient remonter les faux positifs sur les sites sénégalais légitimes au-delà de la règle fixée.
- **Typosquats de marques absentes de la liste** : `wikipedla.org` passe (0,06), et de même les imitations de Senelec et de SEN'EAU, tenues hors de la liste pour l'ablation. Les marques sénégalaises vérifiées sont dans `MARQUES_SN` ; Mixx by Yas, Wizall et les banques locales restent à vérifier.
- **Sites français** : 8,3 % des pages profondes légitimes (sitemaps de sites français) passent le seuil « 90 % », contre 1,4 % avant la correction de l'artefact ; 0,6 % passent le seuil « 80 % ».
- **Faux positifs** sur `letsdefend.io` (0,81) et sur la page de connexion de GitHub (0,65, au-dessus du seuil « 90 % »).
- **Une URL ne dit pas tout** : un site légitime compromis ou un lien raccourci restent hors de portée d'un modèle qui ne voit que l'adresse.
- **Le modèle vieillit** : les campagnes changent vite. Mesurer cette dérive est prévu en phase E.

## Sécurité des fichiers de modèle

`lgbm.joblib` et `charcnn_calib.joblib` sont des fichiers *pickle*, et `charcnn.pt` un fichier PyTorch : charger un pickle exécute du code. `train.py` écrit l'empreinte SHA-256 de chaque modèle dans `models/SHA256SUMS`, et `modeles.py` refuse de charger un fichier dont l'empreinte diffère ; la CI vérifie aussi ces empreintes. Le CNN est chargé avec `weights_only=True` (PyTorch 2.6 ou plus). Le navigateur ne reçoit jamais ces fichiers : `exporter_web.py` écrit `web/modele/url-lgbm.js`, qui n'est qu'une affectation de JSON (arbres, seuils, listes), et la CI vérifie ce format.

## Dans le navigateur

Le vérificateur du site (`web/verifier.html`) n'appelle aucun serveur : la page n'a même pas le droit de se connecter (`connect-src 'none'`). Le modèle y est recalculé en JavaScript (`web/moteur-url.js`) :

- **les 31 attributs** de `features.py`, avec le découpage d'URL de Python reproduit ligne à ligne (`urllib.parse`, `tldextract` et sa liste publique des suffixes, `ipaddress`, le codec `idna`) ;
- **les 668 arbres** LightGBM, la sigmoïde et la calibration de Platt ;
- **les contributions SHAP** (TreeSHAP de LightGBM, opérations dans le même ordre), qui donnent les raisons affichées.

**Parité.** Un modèle porté qui donne presque le même score ne suffit pas : un écart au mauvais endroit change un verdict sans que personne ne le voie. Le test `tests/parite.test.js` compare, à chaque push, 2 642 URL (cas limites écrits à la main et URL synthétiques) : découpage, attributs au bit près en float32, score brut au bit près, contributions SHAP à 1e-9. Sur le corpus complet, `parite_web.py` donne le résultat de [reports/parite_web.md](reports/parite_web.md).

Deux choix rendent cette parité possible :

- les seuils des arbres sont exportés comme le plus grand float32 inférieur ou égal au seuil double de LightGBM, ce qui donne exactement les mêmes comparaisons pour des attributs en float32 ;
- les comportements Unicode de Python (`lower()` avec le sigma final, `isdigit()`, `isupper()`, le `\b` de `re`, `strip()`, `nameprep` d'IDNA 2003) sont exportés sous forme de tables depuis le Python d'entraînement. Le résultat ne dépend donc plus de la version d'Unicode du téléphone.

Limite connue : pour un nom de domaine international qui contient des diacritiques combinants, la vérification de forme NFKC du codec `idna` utilise la normalisation du navigateur, et non les tables d'Unicode 3.2 de Python. Dans le corpus, 28 étiquettes punycode passent par ce chemin, avec le même résultat que Python.

**Coût.** 2,2 Mo de données (environ 920 Ko compressés par GitHub Pages), chargées une fois. Sur ordinateur, environ 0,7 ms par URL pour le verdict et 26 ms avec les explications ; avec un processeur ralenti six fois (test Playwright), le test exige moins d'une seconde en médiane pour le verdict et son affichage ; on mesure de 0,2 à 0,7 s selon la charge de la machine.

**Verdict affiché.** La page n'utilise que les seuils « 80 % » (« Arnaque probable ») et « 90 % » (« Douteux ») ; le seuil « 95 % », qui coûte 11 % de faux positifs au test, ne figure que dans les détails pour analyste.

Après un réentraînement ou une modification de `features.py` ou `modeles.py`, relancer l'export puis la parité ; la CI bloque tant que l'export ne correspond pas au modèle et au code.

## Reproduire

Depuis le dossier `ml/`, dans PowerShell :

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt     # verrou complet avec empreintes ; torch CUDA d'abord : voir ENTRAINER.md
python collect.py                   # reconstruit data/ (non versionné)
python ajout_sn.py                  # pack Sénégal : pages .sn légitimes et typosquats locaux
python accueils_www.py              # forme www. des pages d'accueil légitimes (artefact corrigé)
python train.py --corpus data/corpus_sn_www.csv   # écrit models/ et reports/
python app.py                       # interface locale
python exporter_web.py              # modèle pour le site + jeu de référence de la parité
python parite_web.py --corpus data/corpus_sn_www.csv   # parité Python ↔ navigateur sur tout le corpus
python mesure_sn.py --corpus data/corpus_sn_www.csv    # faux positifs sur des sites .sn légitimes (réseau)
```

`requirements.txt` fige toutes les dépendances, indirectes comprises, avec leurs empreintes : pip vérifie chaque fichier téléchargé. La liste à modifier est `requirements.in` (versions de l'entraînement, Python 3.11) ; on régénère ensuite le verrou avec `uv pip compile requirements.in --universal --python-version 3.11 --generate-hashes --exclude-newer <date du jour moins 7 jours> -o requirements.txt` (aucune version de moins d'une semaine n'entre dans le verrou). Pour monter une seule dépendance indirecte (correctif de sécurité signalé par OSV-Scanner ou une alerte Dependabot), ajouter `--upgrade-package <paquet>` à la même commande : sans cette option, uv garde les versions déjà inscrites dans le verrou. Ces versions ont produit les modèles de `models/` : les changer veut dire réentraîner.

Les données brutes ne sont pas redistribuées : `collect.py` les reconstruit à partir des sources publiques. Détails dans [ENTRAINER.md](ENTRAINER.md). Après un nouvel entraînement, `models/SHA256SUMS` est mis à jour par `train.py` : le committer avec les modèles.

## Le premier jeu

Le jeu d'origine (défis URL, duel contre l'IA, situations mail et pièce jointe, ceintures) est conservé dans [`archives/jeu-url-v0/`](../archives/jeu-url-v0/). Il sera intégré au Dojo en phase C.

## English summary

PhishDojo's URL model started as an audit. Hugging Face's most downloaded phishing-URL model claimed 97 % accuracy, yet it flagged the real French tax website as phishing (1.00) and missed `googIe.com`. I trained my own models (LightGBM on interpretable features, plus a character CNN). I used a **temporal split with unseen domains only**, calibrated scores, thresholds chosen on validation, and Wilson confidence intervals. Every result is expressed as **alerts per day** for a SOC: about 530 alerts/day at 80 % recall on 100,000 URLs/day with a 1/1000 base rate. In October 2026 I audited my own model and found a collection artifact: legitimate homepages came from Tranco lists without `www.`, so the model had learned "homepage with `www.` = phishing" (0.91 for `https://www.lemonde.fr/`), and the test set shared the artifact. After the fix (and a Senegal pack: verified local brands, legitimate `.sn` pages), false positives on legitimate `www.` homepages fell from 94 % to 1.7 % and on legitimate `.sn` pages from 42 % to 3 % at the 90 %-recall threshold; the headline numbers are lower than the ones published before (about 240 alerts/day), partly because the artifact inflated them and partly through a real regression: false positives on deep pages of French sites rose from 1.4 % to 8.3 %. The model was chosen among six variants by a rule fixed on validation; its known blind spot is phishing hosted on `.sn` domains (15 % recall). A random split overstates recall at 0.1 % FPR by 35 to 50 points depending on the corpus version (34.7 on the current one). The browser verifier reproduces the Python model bit for bit (0 differences on 472,278 URLs).
