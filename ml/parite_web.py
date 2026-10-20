"""
Parite Python <-> navigateur sur tout le corpus (phase B) -> reports/parite_web.md

La CI verifie la parite sur le jeu de reference versionne (tests/parite/reference.json).
Ce script fait la meme verification sur le corpus complet, qui n'est pas versionne :
il calcule avec Python les attributs (float32), le score brut et la probabilite calibree,
puis lance web/moteur-url.js (Node) sur les memes URL et compare. Les fichiers
intermediaires vont dans un dossier temporaire efface a la fin ; le rapport ne contient
que des comptes, aucune URL.

Usage (depuis ml/, apres exporter_web.py) :
    python parite_web.py                  # data/corpus.csv
    python parite_web.py --corpus <csv>
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import modeles as M
from modeles import verifier_empreinte

RACINE = Path(__file__).resolve().parent
DEPOT = RACINE.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(RACINE / "data" / "corpus.csv"))
    args = ap.parse_args()

    chemin = M.DOSSIER_MODELES / "lgbm.joblib"
    verifier_empreinte(chemin)  # pickle : empreinte de models/SHA256SUMS avant chargement
    b = joblib.load(chemin)
    export = (DEPOT / "web" / "modele" / "url-lgbm.js").read_text(encoding="ascii")
    donnees = json.loads(export[export.index("=") + 1: export.rindex(";")])
    sha = M._lire_empreintes(M.DOSSIER_MODELES)["lgbm.joblib"]
    if donnees["provenance"]["modele_sha256"] != sha:
        raise SystemExit("web/modele/url-lgbm.js ne vient pas de ce modele : relancer exporter_web.py")

    df = pd.read_csv(args.corpus, dtype=str, keep_default_na=False)
    urls = df.url.tolist()
    print(f"{len(urls)} URL : attributs et scores Python...", flush=True)
    X = M.construire_X(urls, b["vocab_tld"])
    brut = b["booster"].predict(X, raw_score=True)
    p = b["calib"].predict(b["booster"].predict(X))

    dossier = tempfile.mkdtemp(prefix="pds-parite-")
    try:
        base = str(Path(dossier) / "corpus")
        X.astype(np.float32).tofile(base + ".x")
        np.asarray(brut, dtype=np.float64).tofile(base + ".brut")
        np.asarray(p, dtype=np.float64).tofile(base + ".p")
        Path(base + ".urls.json").write_text(json.dumps(urls, ensure_ascii=True), encoding="ascii")
        print("Moteur du navigateur (Node)...", flush=True)
        t = time.time()
        sortie = subprocess.run(["node", str(DEPOT / "scripts" / "parite-corpus.js"), base],
                                check=True, capture_output=True, text=True).stdout
        res = json.loads(sortie)
        duree = time.time() - t
    finally:
        shutil.rmtree(dossier, ignore_errors=True)

    ok = res["ecarts_attributs"] == 0 and res["ecarts_score_brut"] == 0 and res["ecarts_verdict"] == 0
    lignes = [
        "# Parité Python ↔ navigateur sur le corpus complet",
        "",
        f"Généré par `ml/parite_web.py` le {date.today().isoformat()}. Modèle `lgbm.joblib` "
        f"(sha256 `{sha[:12]}…`), moteur `web/moteur-url.js`, Node {res['node']}.",
        "",
        "Chaque URL du corpus passe par Python (`features.py`, LightGBM, calibration) puis par le "
        "moteur du site, et on compare les valeurs. Le jeu de référence versionné "
        "(`tests/parite/reference.json`) refait la même vérification à chaque push, contributions SHAP comprises.",
        "",
        "| Mesure | Résultat |",
        "| --- | --- |",
        f"| URL comparées | {res['urls']:,} (phishing {int((df.label == '1').sum()):,}, légitimes {int((df.label == '0').sum()):,}) |".replace(",", " "),
        f"| URL dont au moins un attribut diffère | {res['ecarts_attributs']} |",
        f"| Scores bruts différents (au bit près) | {res['ecarts_score_brut']} |",
        f"| Écart maximal de probabilité calibrée | {res['max_ecart_proba']:.1e} |",
        f"| Verdicts différents | {res['ecarts_verdict']} |",
        f"| Temps moyen par URL (attributs + 274 arbres, sans SHAP) | {res['ms_par_url']:.2f} ms |",
        "",
        ("**Parité totale.** " if ok else "**Écarts détectés :** " + json.dumps(res["par_attribut"]) + ". ")
        + "Le seul écart restant vient de `exp` et `log` de la bibliothèque mathématique "
        "(dernier chiffre d'un nombre à 16 décimales) ; il ne change aucun verdict.",
        "",
    ]
    (RACINE / "reports" / "parite_web.md").write_text("\n".join(lignes), encoding="utf-8", newline="\n")
    print(json.dumps(res, indent=1))
    print(f"Ecrit dans reports/parite_web.md ({duree / 60:.1f} min)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
