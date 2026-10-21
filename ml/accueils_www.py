"""
Correction d'un artefact du corpus : pages d'accueil legitimes avec www. -> data/corpus_sn_www.csv

Les 57 916 pages d'accueil legitimes viennent des listes Tranco, ecrites https://domaine/ :
6 seulement commencent par www., alors que le phishing reel en compte des dizaines de
milliers. Le modele avait appris « page d'accueil en www. = phishing » : l'ancien modele
donnait 0,91 a https://www.lemonde.fr/ et 0,02 a https://lemonde.fr/. Le test temporel
partageant l'artefact, aucune metrique ne le montrait (reports/reentrainement_sn.md).

Pour chaque page d'accueil legitime dont l'hote est le domaine enregistre lui-meme, on
ajoute la meme page avec www., meme date et meme etiquette : c'est le meme site. Les ajouts
se repartissent donc entre entrainement, validation et test, et le test mesure la correction.

Usage (depuis ml/, apres ajout_sn.py) :
    python accueils_www.py
    python augmenter_sn.py
"""

import argparse
import csv
import sys
from pathlib import Path

import pandas as pd

import features as F

RACINE = Path(__file__).resolve().parent
DATA = RACINE / "data"


def variante_www(url):
    """https://domaine/ -> https://www.domaine/ si l'URL est une page d'accueil sur le domaine
    enregistre lui-meme (pas de sous-domaine, pas de chemin ni de requete) ; sinon None."""
    d = F.decouper(url)
    hote, chemin, requete, enreg, sous = d[0], d[2], d[3], d[4], d[5]
    if requete or chemin.strip("/") or sous or not d[6] or hote.lower() != enreg:
        return None
    schema = url.split("://", 1)[0] + "://" if "://" in url else "https://"
    return f"{schema}www.{enreg}/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(DATA / "corpus_sn.csv"))
    ap.add_argument("--sortie", default=str(DATA / "corpus_sn_www.csv"))
    args = ap.parse_args()

    df = pd.read_csv(args.corpus, dtype=str, keep_default_na=False)
    connus = set(df.url)
    ajout = []
    for r in df[df.label == "0"].itertuples(index=False):
        v = variante_www(r.url)
        if v and v not in connus and F.domaine_enregistre(v) not in F.DOMAINES_ABLATION:
            connus.add(v)
            ajout.append((v, "0", r.first_seen, r.source + "-www", r.synthetique))

    with open(args.sortie, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "label", "first_seen", "source", "synthetique"])
        for r in df.itertuples(index=False):
            w.writerow([r.url, r.label, r.first_seen, r.source, r.synthetique])
        w.writerows(ajout)
    print(f"{len(ajout)} pages d'accueil legitimes ajoutees sous leur forme www. ; "
          f"{Path(args.sortie).name} : {len(df) + len(ajout)} URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
