# Entrainer ton propre classifieur

Cinq commandes, environ deux heures en tout, dont la plupart a attendre.

```powershell
python collect.py      # construit le corpus          ~20-40 min
python ajout_sn.py     # pack Senegal : pages .sn legitimes (Common Crawl, lent) et typosquats locaux  ~30-60 min
python accueils_www.py # forme www. des pages d'accueil legitimes (artefact corrige)   ~1 min
python train.py --corpus data/corpus_sn_www.csv   # entraine et evalue   ~5 min sur la RTX 4060
python app.py          # tes modeles dans l'interface
```

Puis, pour le site : `python exporter_web.py`, `python parite_web.py --corpus data/corpus_sn_www.csv`
et `python mesure_sn.py --corpus data/corpus_sn_www.csv` (voir README.md, « Dans le navigateur »).
La comparaison des decoupes publiee : `python train.py --corpus data/corpus_sn_www.csv --comparaison-seule`.
Les variantes et le choix du modele : `ml/reports/reentrainement_sn.md`, section « Reproduire ».
Enfin, reporter les nouveaux chiffres dans `web/modele.html` : `npm test` dit lesquels ont change.

Premiere fois ? Fais d'abord `python collect.py --rapide` puis `python train.py --sans-cnn`
(5 minutes en tout) pour verifier que toute la chaine tourne avant la vraie collecte.

---

## 0. Preparer l'environnement (une seule fois)

Dans le dossier `ml/`, avec le `.venv` active :

```powershell
pip uninstall -y torch
pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cu126
pip install -r requirements.txt
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

La derniere ligne doit afficher `True NVIDIA GeForce RTX 4060 ...`. Si elle affiche `False`,
c'est la version CPU de torch qui est installee : sur Windows, `pip install torch` tout court
prend toujours la version CPU, meme avec une carte NVIDIA.

Il faut aussi **Git** (`git --version`). Sans lui, la collecte ne recupere que le flux
du jour et la decoupe temporelle devient impossible.

---

## 1. `collect.py` — le corpus

Ce qu'il va chercher :

| Source | Classe | Date | Role |
| --- | --- | --- | --- |
| Historique Git du flux OpenPhish | phishing | oui, au jour pres, depuis oct. 2024 | coeur du corpus, ~220 000 URL |
| `ealvaradob/phishing-dataset` | les deux | non (anterieur a 2024) | volume d'entrainement |
| Common Crawl, domaines francais | legitime | oui, date de capture | corrige l'echec impots.gouv.fr |
| Common Crawl, top Tranco | legitime | oui | legitimes internationaux |
| Sitemaps des sites | legitime | lastmod | repli si Common Crawl sature |
| Pages d'accueil, listes Tranco historiques | legitime | date de la liste | equilibre la part « domaine nu » entre les classes |
| Typosquats generes | phishing | non | corrige l'echec des homoglyphes |

Le flux OpenPhish est versionne sur GitHub : chaque commit est un instantane date.
C'est ce qui donne un vrai corpus de phishing horodate, gratuit, sur deux ans.

Les legitimes se collectent en deux passes :

1. **Les sitemaps de tous les domaines, en parallele** — quelques minutes, fiable.
2. **Common Crawl, dans un budget de temps** (`--budget-cc 30` minutes par defaut). L'index est
   souvent sature (erreurs 502, 504, transferts coupes) : il complete les dates, mais il ne
   peut plus bloquer ni faire planter la collecte. Quand il sature sur un domaine, le script
   passe au suivant.

Les erreurs reseau ne s'affichent plus une par une : une seule ligne les resume a la fin de
chaque passe (« incidents reseau absorbes : HTTP 504 x37, IncompleteRead x2 »). C'est normal.

Tout est mis en cache dans `data/raw/` : si tu relances, ce qui a deja ete telecharge n'est
pas redemande, et Common Crawl reprend la ou il s'etait arrete.

**Lis le diagnostic a la fin.** C'est la verification de la phase 1 de la feuille de route :

- les deux classes doivent couvrir les **memes trimestres** ;
- la part `https` et la part « avec chemin » doivent etre **comparables** entre les classes.

Si les legitimes sont tous en `https` et les phishing a 60 %, ce n'est pas grave : le schema
est retire de l'entree des modeles. Mais note-le dans tes limitations.

---

## 2. `train.py` — entrainement et evaluation

Deux modeles :

- **LightGBM sur 30 attributs** (phase 2) : rapide, et il sait dire *pourquoi*.
- **CNN sur les caracteres** : lit chaque octet, casse et unicode compris — la ou le BERT de
  reference, *uncased*, transforme `googIe` en `googie` avant meme de le lire.

Ajoute `--bert` pour evaluer le BERT de reference sur exactement le meme test.

Le protocole que le script applique, et que tu dois savoir reciter :

1. **Decoupe temporelle** : entrainement sur le passe, test sur les dernieres semaines.
2. **Phishing du test sur des domaines jamais vus** a l'entrainement.
3. **Seuils choisis sur la validation**, mesures une seule fois sur le test.
4. **Calibration** (Platt) : un score de 0,7 veut dire quelque chose.
5. **Projection a 1 pour 1000** : alertes par jour, avec intervalle de confiance.
6. **Meme modele en decoupe aleatoire**, pour publier l'ecart.
7. **Ablation** sur les 6 domaines, **absents de tout le corpus**. `wikipedia.org` et
   `letsdefend.io` ne sont meme pas dans la liste de marques : ils mesurent ce que le modele
   a appris sans dictionnaire.

### Lire `reports/rapport.md`

La ligne qui repond a ta question de recherche : dans le tableau du LightGBM, la ligne
« 90 % » — rappel obtenu au test, taux de faux positifs **avec son intervalle**, alertes par jour.

Puis, dans cet ordre :

- **L'intervalle de confiance.** Avec 3 000 legitimes au test, 0 faux positif veut dire
  « entre 0 et 0,13 % » — soit jusqu'a 130 fausses alertes par jour. Si l'intervalle est trop
  large pour conclure, il faut plus de legitimes : `python collect.py --par-domaine 300`.
- **Les sous-groupes.** Le taux sur les domaines francais, et surtout sur les domaines
  legitimes **jamais vus** : c'est la que se cache le prochain impots.gouv.fr.
- **Les attributs dominants.** Si le rapport t'avertit que l'extension du domaine pese trop,
  c'est probablement un artefact de construction (les legitimes ont ete choisis en `.fr`).
  Relance avec `python train.py --sans-tld` et compare l'ablation. Garder la version qui
  generalise le mieux, pas celle qui a le meilleur AUC.
- **L'ecart aleatoire / temporel.** C'est le resultat le plus important a publier.

Ne t'attends pas a gagner partout. Un typosquat de `wikipedia.org` qui passe est un **bon**
resultat a publier : il montre la limite exacte de l'approche — sans connaitre la marque,
un domaine imite n'est qu'un domaine.

---

## 3. `app.py` — tes modeles dans l'interface

Relance `python app.py` : tes modeles apparaissent en tete du selecteur.

- **Une URL** : avec le LightGBM, les trois attributs qui ont pese, et la probabilite
  corrigee au taux de base reel — la meme URL a 95 % sur un lot equilibre tombe souvent
  sous les 5 % dans un vrai trafic.
- **Duel** : ton modele contre le BERT de reference, tries par desaccord. Les desaccords sont
  exactement les URL a mettre dans ton README.

---

## 4. Publier ton modele en Space

Le dossier `space\` contient le code. Ajoute-y ton dossier `models\` (quelques Mo), puis
televerse le tout sur un Space Gradio. Ton modele, celui de reference et l'auditeur,
cote a cote, en ligne : c'est la demonstration a partager.

---

## Ce qui reste hors du perimetre (a ecrire dans les limitations)

- URL seules : ni contenu d'e-mail, ni page visitee.
- Pas d'age de domaine (WHOIS) : la donnee la plus utile manquante.
- Pas de test adverse contre un attaquant qui connaitrait le modele.
- Legitimes echantillonnes depuis des sites connus : le trafic reel d'une entreprise
  contient plus d'outils internes et de SaaS que Common Crawl.
