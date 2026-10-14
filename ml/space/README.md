---
title: Phishing URL Auditor
emoji: 🛡️
colorFrom: indigo
colorTo: blue
sdk: gradio
app_file: app.py
pinned: false
license: mit
short_description: Auditer un modele de detection de phishing sur URL
---

# Auditeur de modeles de detection de phishing

Un classifieur d'URL annonce souvent « 97 % d'exactitude ». Ce Space sert a
verifier ce que ce chiffre vaut en exploitation reelle.

## Trois outils

**Une URL.** Verdict, probabilite, et la distance au seuil — une decision a
0,52 n'est pas une decision a 0,99.

**Lot etiquete.** Colle des URL dont tu connais la nature (`+` phishing,
`-` legitime). Tu obtiens rappel, precision, taux de faux positifs, puis la
projection qui compte vraiment : **combien d'alertes par jour** sur 100 000 URL
avec un taux de base de 1 pour 1000. C'est la seule metrique qu'un responsable
SOC ecoute.

**Ablation.** On fait varier un seul facteur a la fois — le schema `https`/`http`,
puis l'orthographe du domaine — sur six domaines connus. Si le verdict bascule
sur le seul passage en `http`, le modele a appris la facon dont ses donnees ont
ete collectees, pas le phishing.

## Ce que l'audit de reference revele

Sur `ealvaradob/bert-finetuned-phishing`, le modele phishing le plus telecharge
du Hub, mesure le 3 octobre 2026 :

- il classe **`https://www.impots.gouv.fr/portail/particulier` comme phishing
  a 1,000** — l'URL correcte du site des impots francais, confiance maximale ;
- le seul passage en `http` fait basculer 2 domaines legitimes sur 5 ;
- il manque 2 typosquats sur 5, et ce sont les deux attaques par homoglyphe
  (`accounts.googIe.com`, `fr.wikipedla.org`), les plus difficiles a reperer a l'oeil ;
- il n'est pas calibre : sur 24 predictions, presque toutes valent 0,000 ou 1,000,
  ce qui rend le reglage du seuil inoperant.

## Mes modeles

Si le dossier `models/` est present, deux modeles entraines avec un protocole honnete
apparaissent en tete du selecteur — decoupe temporelle, domaines de test jamais vus,
calibration, evaluation a 1 phishing pour 1000 :

- **LightGBM sur 30 attributs**, qui explique chaque verdict (contributions SHAP) ;
- **CNN sur les caracteres**, sensible a la casse et a l'unicode — la ou un tokenizer
  *uncased* lit `googIe` comme `googie`.

L'onglet **Duel** les oppose au modele de reference, URL par URL, tries par desaccord.

## Limites

Seule la chaine de caracteres de l'URL est analysee — aucune page n'est visitee,
aucun contenu d'e-mail n'est lu. Un score n'est pas une preuve : il sert a
prioriser une file d'analyse, jamais a bloquer automatiquement.

## Publier le Space

`features.py` et `modeles.py` ne sont pas dupliqués dans ce dossier : ils sont copiés depuis `ml/` au moment de publier, avec le dossier `models/` (vérifier d'abord les empreintes avec `sha256sum -c models/SHA256SUMS`).
