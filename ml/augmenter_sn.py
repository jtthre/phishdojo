"""
Augmentation : du phishing reel « reheberge » en .sn -> data/corpus_sn_aug.csv

Pourquoi : avec 2 761 pages .sn legitimes et 43 vrais phishing en .sn a l'entrainement, le
modele apprenait « .sn = legitime » et laissait passer un phishing generique sur un domaine
.sn (reports/reentrainement_sn.md). On prend des phishing reels de la periode
d'entrainement et on remplace l'extension de leur domaine par .sn (ou .com.sn) : chemin,
mots d'appat et structure restent ceux d'une vraie attaque. Le modele apprend que .sn est
une extension neutre et que le reste de l'adresse decide.

Les lignes ajoutees sont marquees synthetiques : elles ne vont qu'a l'entrainement, jamais
en validation ni au test. reheberger_sn() sert aussi a comparer_modeles.py, sur le phishing
de la periode de test, pour mesurer la detection du phishing heberge en .sn.

Usage (depuis ml/, apres ajout_sn.py et accueils_www.py) :
    python augmenter_sn.py                 # 3 000 URL (dosage choisi : reports/reentrainement_sn.md)
    python train.py --corpus data/corpus_sn_aug.csv --sortie sn_aug
"""

import argparse
import csv
import random
import sys
from pathlib import Path

import pandas as pd

import features as F
from ajout_sn import coupures

RACINE = Path(__file__).resolve().parent
DATA = RACINE / "data"


def reheberger_sn(url, rng):
    """Meme URL, extension du domaine enregistre remplacee par .sn (80 %) ou .com.sn (20 %).
    None si l'hote est une adresse IP, un hebergeur partage, ou deja en .sn."""
    hote, _, _, _, enreg, _, suffixe, prive, _ = F.decouper(url)
    # blogspot.<pays> n'est pas marque « prive » dans la liste publique des suffixes
    if not suffixe or prive or suffixe.split(".")[-1] == "sn" or F._est_ip(hote) or "blogspot." in hote.lower():
        return None
    hote_min = hote.lower()
    if not hote_min.endswith("." + suffixe):
        return None
    nouveau = hote_min[: -len(suffixe)] + ("sn" if rng.random() < 0.8 else "com.sn")
    i = url.lower().find(hote_min)
    return url[:i] + nouveau + url[i + len(hote_min):] if i >= 0 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(DATA / "corpus_sn_www.csv"))
    ap.add_argument("--sortie", default=str(DATA / "corpus_sn_aug.csv"))
    ap.add_argument("--nombre", type=int, default=3000)
    args = ap.parse_args()
    rng = random.Random(2026)

    df = pd.read_csv(args.corpus, dtype=str, keep_default_na=False)
    t_val, _ = coupures(df)
    # phishing reel de la periode d'entrainement uniquement (datee avant la validation)
    source = df[(df.label == "1") & (df.synthetique == "0") & (df.first_seen != "") & (df.first_seen < t_val)]
    candidats = source.url.tolist()
    rng.shuffle(candidats)
    connus, ajout = set(df.url), []
    for u in candidats:
        v = reheberger_sn(u, rng)
        if v and v not in connus and F.domaine_enregistre(v) not in F.DOMAINES_ABLATION:
            connus.add(v)
            ajout.append(v)
            if len(ajout) == args.nombre:
                break

    with open(args.sortie, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "label", "first_seen", "source", "synthetique"])
        for r in df.itertuples(index=False):
            w.writerow([r.url, r.label, r.first_seen, r.source, r.synthetique])
        for v in ajout:
            w.writerow([v, "1", "", "augmentation-sn", 1])
    print(f"{len(ajout)} phishing reels reheberges en .sn (entrainement seulement) ; "
          f"{Path(args.sortie).name} : {len(df) + len(ajout)} URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
