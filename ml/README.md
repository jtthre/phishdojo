# Le modèle — détecter le phishing, et mesurer ce que ça coûte

Tout est parti d'un audit. Le détecteur d'URL de phishing le plus téléchargé de Hugging Face annonçait 97 % d'exactitude. Testé sur des cas réels, il classait **le vrai site des impôts comme phishing (1,00)** et laissait passer **`googIe.com`** (un I majuscule à la place du l). Il avait surtout appris la façon dont ses données avaient été collectées, et beaucoup moins le phishing.

J'ai donc entraîné mon propre modèle, avec un protocole pensé pour l'exploitation en SOC plutôt que pour un score flatteur. C'est ce modèle qui fait tourner le vérificateur de PhishDojo, directement dans le navigateur (page `verifier.html`, phase B de la [feuille de route](../README.md#feuille-de-route)) : [voir plus bas](#dans-le-navigateur).

| URL | Modèle public | Mon modèle |
| --- | --- | --- |
| `impots.gouv.fr` (légitime) | 1,00 → bloqué à tort | **0,02** → légitime |
| `googIe.com` (imitation) | 0,00 → ignoré | **0,97** → détecté |

## Contenu du dossier

| Fichier | Rôle |
| --- | --- |
| `collect.py` | Construit le corpus : historique daté du flux OpenPhish, jeu `ealvaradob/phishing-dataset`, pages légitimes via sitemaps et Common Crawl, pages d'accueil issues des listes Tranco historiques. |
| `features.py` | Trente attributs lisibles : longueurs, entropie, TLD, hébergeurs gratuits, marques imitées, confusables (`0`/`o`, `I`/`l`, `rn`/`m`). |
| `train.py` | Entraîne LightGBM (attributs) et un CNN sur caractères, calibre les scores, fixe les seuils en validation et génère le rapport. |
| `modeles.py` | Calibration de Platt, CNN, explication SHAP par URL. |
| `ablation.py` | Fait varier un seul facteur à la fois (`http`/`https`, orthographe du domaine) sur des domaines absents du corpus. |
| `app.py` | Interface Gradio locale : une URL, un lot étiqueté, ou l'ablation. |
| `exporter_web.py` | Exporte le modèle pour le site (`web/modele/url-lgbm.js`, données seules) et le jeu de référence de la parité (`tests/parite/reference.json`). |
| `parite_web.py` | Compare Python et le moteur du site sur tout le corpus ; écrit `reports/parite_web.md`. |
| `mesure_sn.py` | Faux positifs sur des sites `.sn` légitimes (Tranco, pages d'accueil et sitemaps) ; écrit `reports/mesure_sn.md`. |
| `test_phishing.py` | Audit d'un modèle du Hub sur des cas dont on connaît la nature ([LANCER.md](LANCER.md)). |
| `space/` | La même interface, prête pour un Space Hugging Face. |
| `reports/` | Rapport d'entraînement, métriques, comparaison des découpes. `reports_sans_tld/` : la variante entraînée sans le TLD. |
| `models/` | Modèles entraînés (LightGBM 1,9 Mo, CNN 0,8 Mo) et leurs empreintes `SHA256SUMS`. |

## La question posée

> À quel taux de faux positifs peut-on détecter 90 % du phishing, sur des campagnes que le modèle n'a jamais vues ?

Un analyste SOC ne travaille pas avec une AUC. Il travaille avec un nombre d'alertes par jour. Toutes les métriques sont donc projetées sur **100 000 URL par jour, dont 1 phishing pour 1 000**.

## Protocole

- **Découpe temporelle** : entraînement avant février 2026, validation de février à juin, test après le 12 juin 2026.
- **Domaines nouveaux uniquement au test** : 5 062 URL de phishing retirées parce que leur domaine apparaissait déjà à l'entraînement.
- **Scores calibrés** (Platt) et **seuils choisis en validation**, jamais sur le test.
- **Intervalles de confiance** de Wilson sur chaque taux de faux positifs.
- **Ablation** sur six domaines absents de tout le corpus : on change un seul facteur à la fois (http/https, vraie orthographe ou typosquat).
- **Biais corrigé en cours de route** : les phishing étaient souvent des domaines nus, alors que tous les légitimes avaient un chemin. Le modèle apprenait « pas de chemin = phishing ». J'ai ajouté des pages d'accueil légitimes tirées des listes Tranco, et un contrôle automatique de cet écart dans `collect.py`.

| Ensemble | Phishing | Légitimes |
| --- | --- | --- |
| Entraînement | 216 331 | 102 199 |
| Validation | 23 307 | 8 093 |
| Test | 28 094 | 16 566 |

## Résultats (LightGBM, test temporel)

| Rappel visé | Rappel obtenu | Taux de faux positifs [IC 95 %] | Alertes / jour |
| --- | --- | --- | --- |
| 80 % | 82,1 % | 0,16 % [0,11 – 0,23] | **≈ 240** |
| 90 % | 90,0 % | 1,38 % [1,22 – 1,57] | ≈ 1 470 |
| 95 % | 94,6 % | 7,05 % [6,67 – 7,45] | ≈ 7 140 |

AUC ROC 0,985. Le CNN sur caractères atteint une AUC proche (0,988) mais ne détecte aucun des typosquats de l'ablation. LightGBM est donc le modèle retenu.

**Découpe aléatoire contre découpe temporelle** : même LightGBM, mêmes URL datées, seule la façon de tirer le test change. Une découpe aléatoire annonce 92,5 % de rappel à 0,1 % de faux positifs ; la découpe temporelle donne 54,0 %. **Soit 38,5 points de surestimation** pour le modèle complet, et encore 16,0 points pour la variante sans TLD, parce que des URL d'une même campagne se retrouvent des deux côtés de la frontière. C'est le résultat le plus important du projet : la plupart des scores publiés sur ce sujet mesurent la mémoire du modèle, pas sa capacité à généraliser.

Détail : [reports/comparaison_decoupes.md](reports/comparaison_decoupes.md) (fait foi pour cet écart) et [reports/rapport.md](reports/rapport.md).

## Limites connues

Je les liste parce qu'elles comptent autant que les scores.

- **Le TLD pèse 30,9 % des décisions.** Une partie de ce poids vient de la construction du corpus (légitimes surtout en `.fr`, phishing venu d'un flux mondial). Une variante sans TLD est entraînée pour comparaison (`reports_sans_tld/`). **Mesuré sur des sites sénégalais** (octobre 2026, 318 pages de 62 sites `.sn` légitimes jamais vus à l'entraînement) : 1,3 % de faux positifs au seuil « 80 % de rappel », 17,3 % au seuil « 90 % », 51 % au seuil « 95 % » ; les pages d'accueil passent (0 % aux deux premiers seuils). Cause principale : l'extension `sn` est absente du vocabulaire des TLD, donc traitée comme une extension rare ; avec le code de `.com`, les faux positifs au seuil « 90 % » tombent de 55 à 8. Détail : [reports/mesure_sn.md](reports/mesure_sn.md). Prochaine étape : réentraîner avec des sites `.sn` et les marques sénégalaises.
- **Typosquats de marques absentes de la liste** : `wikipedla.org` passe (0,045). Les marques locales (Wave, Orange Money, Free Money…) restent à ajouter.
- **Faux positif** sur `letsdefend.io` (0,86) : un domaine légitime mais peu courant, sur un TLD souvent abusé.
- **Une URL ne dit pas tout** : un site légitime compromis ou un lien raccourci restent hors de portée d'un modèle qui ne voit que l'adresse.
- **Le modèle vieillit** : les campagnes changent vite. Mesurer cette dérive est prévu en phase E.

## Sécurité des fichiers de modèle

`lgbm.joblib` et `charcnn_calib.joblib` sont des fichiers *pickle*, et `charcnn.pt` un fichier PyTorch : charger un pickle exécute du code. `train.py` écrit l'empreinte SHA-256 de chaque modèle dans `models/SHA256SUMS`, et `modeles.py` refuse de charger un fichier dont l'empreinte diffère ; la CI vérifie aussi ces empreintes. Le CNN est chargé avec `weights_only=True` (PyTorch 2.6 ou plus). Le navigateur ne reçoit jamais ces fichiers : `exporter_web.py` écrit `web/modele/url-lgbm.js`, qui n'est qu'une affectation de JSON (arbres, seuils, listes), et la CI vérifie ce format.

## Dans le navigateur

Le vérificateur du site (`web/verifier.html`) n'appelle aucun serveur : la page n'a même pas le droit de se connecter (`connect-src 'none'`). Le modèle y est recalculé en JavaScript (`web/moteur-url.js`) :

- **les 31 attributs** de `features.py`, avec le découpage d'URL de Python reproduit ligne à ligne (`urllib.parse`, `tldextract` et sa liste publique des suffixes, `ipaddress`, le codec `idna`) ;
- **les 274 arbres** LightGBM, la sigmoïde et la calibration de Platt ;
- **les contributions SHAP** (TreeSHAP de LightGBM, opérations dans le même ordre), qui donnent les raisons affichées.

**Parité.** Un modèle porté qui donne presque le même score ne suffit pas : un écart au mauvais endroit change un verdict sans que personne ne le voie. Le test `tests/parite.test.js` compare, à chaque push, 2 638 URL (cas limites écrits à la main et URL synthétiques) : découpage, attributs au bit près en float32, score brut au bit près, contributions SHAP à 1e-9. Sur le corpus complet, `parite_web.py` donne le résultat de [reports/parite_web.md](reports/parite_web.md).

Deux choix rendent cette parité possible :

- les seuils des arbres sont exportés comme le plus grand float32 inférieur ou égal au seuil double de LightGBM, ce qui donne exactement les mêmes comparaisons pour des attributs en float32 ;
- les comportements Unicode de Python (`lower()` avec le sigma final, `isdigit()`, `isupper()`, le `\b` de `re`, `strip()`, `nameprep` d'IDNA 2003) sont exportés sous forme de tables depuis le Python d'entraînement. Le résultat ne dépend donc plus de la version d'Unicode du téléphone.

Limite connue : pour un nom de domaine international qui contient des diacritiques combinants, la vérification de forme NFKC du codec `idna` utilise la normalisation du navigateur, et non les tables d'Unicode 3.2 de Python. Dans le corpus, 28 étiquettes punycode passent par ce chemin, avec le même résultat que Python.

**Coût.** 1 Mo de données (environ 410 Ko compressés par GitHub Pages), chargé une fois. Sur ordinateur, environ 0,4 ms par URL pour le verdict et 13 ms avec les explications ; avec un processeur ralenti six fois (test Playwright), le verdict et son affichage prennent environ 110 ms en médiane.

**Verdict affiché.** La page n'utilise que les seuils « 80 % » (« Arnaque probable ») et « 90 % » (« Douteux ») ; le seuil « 95 % », qui coûte 7 % de faux positifs au test et 51 % sur des pages `.sn`, ne figure que dans les détails pour analyste.

Après un réentraînement ou une modification de `features.py` ou `modeles.py`, relancer l'export puis la parité ; la CI bloque tant que l'export ne correspond pas au modèle et au code.

## Reproduire

Depuis le dossier `ml/`, dans PowerShell :

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt     # verrou complet avec empreintes ; torch CUDA d'abord : voir ENTRAINER.md
python collect.py                   # reconstruit data/ (non versionné)
python train.py                     # écrit models/ et reports/
python app.py                       # interface locale
python exporter_web.py              # modèle pour le site + jeu de référence de la parité
python parite_web.py                # parité Python ↔ navigateur sur tout le corpus
python mesure_sn.py                 # faux positifs sur des sites .sn légitimes (réseau)
```

`requirements.txt` fige toutes les dépendances, indirectes comprises, avec leurs empreintes : pip vérifie chaque fichier téléchargé. La liste à modifier est `requirements.in` (versions de l'entraînement, Python 3.11) ; on régénère ensuite le verrou avec `uv pip compile requirements.in --universal --python-version 3.11 --generate-hashes --exclude-newer <date du jour moins 7 jours> -o requirements.txt` (aucune version de moins d'une semaine n'entre dans le verrou). Pour monter une seule dépendance indirecte (correctif de sécurité signalé par OSV-Scanner ou une alerte Dependabot), ajouter `--upgrade-package <paquet>` à la même commande : sans cette option, uv garde les versions déjà inscrites dans le verrou. Ces versions ont produit les modèles de `models/` : les changer veut dire réentraîner.

Les données brutes ne sont pas redistribuées : `collect.py` les reconstruit à partir des sources publiques. Détails dans [ENTRAINER.md](ENTRAINER.md). Après un nouvel entraînement, `models/SHA256SUMS` est mis à jour par `train.py` : le committer avec les modèles.

## Le premier jeu

Le jeu d'origine (défis URL, duel contre l'IA, situations mail et pièce jointe, ceintures) est conservé dans [`archives/jeu-url-v0/`](../archives/jeu-url-v0/). Il sera intégré au Dojo en phase C.

## English summary

PhishDojo's URL model started as an audit. Hugging Face's most downloaded phishing-URL model claimed 97 % accuracy, yet it flagged the real French tax website as phishing (1.00) and missed `googIe.com`. I trained my own models (LightGBM on interpretable features, plus a character CNN). I used a **temporal split with unseen domains only**, calibrated scores, thresholds chosen on validation, and Wilson confidence intervals. Every result is expressed as **alerts per day** for a SOC: about 240 alerts/day at 82 % recall on 100,000 URLs/day with a 1/1000 base rate. On the same dated URLs, a random split overstates recall at 0.1 % FPR by **38.5 points** for the full model (16.0 points without the TLD feature).
