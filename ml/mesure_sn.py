"""
Faux positifs du modele sur des sites senegalais legitimes (phase B) -> reports/mesure_sn.md

Le modele a appris sur des sites surtout francais et internationaux. Avant de le presenter
au public senegalais, on mesure combien de pages legitimes en .sn il classe a tort comme
phishing, a chacun des trois seuils fixes en validation (jamais ajustes ici).

Population : les domaines dont le suffixe public est en .sn (sn, com.sn, gouv.sn...) dans
la liste Tranco des sites les plus visites, indicateur courant de legitimite ; leur page
d'accueil et des pages tirees de leur sitemap. Les domaines deja presents dans le corpus
d'entrainement sont comptes a part : la mesure qui compte est celle sur les domaines jamais vus.

Le rapport ne contient que des comptes et des noms de domaines publics, aucun chemin.

Usage (depuis ml/) :
    python mesure_sn.py                     # Tranco + sitemaps (reseau), cache dans data/raw/
    python mesure_sn.py --pages 20          # pages de sitemap par domaine
"""

import argparse
import math
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import joblib
import pandas as pd

import collect as C
import features as F
import modeles as M
from modeles import verifier_empreinte

RACINE = Path(__file__).resolve().parent
CIBLES = (0.8, 0.9, 0.95)


def wilson(k, n, z=1.96):
    if n == 0:
        return 0.0, 1.0
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - m), min(1.0, c + m)


def suffixe(domaine):
    return F.decouper("https://" + domaine)[6]


def domaines_sn():
    """Domaines Tranco dont le suffixe public se termine par « sn », dans l'ordre du classement."""
    return [d for d in C._tranco().list().top(1_000_000) if suffixe(d).split(".")[-1] == "sn"]


def pct(x, n=2):
    return f"{100 * x:.{n}f} %".replace(".", ",")


def tableau(titre, groupes, seuils):
    s = [f"### {titre}", "", "| Population | Domaines | Pages | "
         + " | ".join(f"Faux positifs au seuil « {int(c * 100)} % de rappel »" for c in CIBLES) + " |",
         "| --- | --- | --- | " + " | ".join("---" for _ in CIBLES) + " |"]
    for nom, lignes in groupes:
        n = len(lignes)
        doms = len(set(d for d, _, _ in lignes))
        cases = []
        for c in CIBLES:
            k = sum(1 for _, _, p in lignes if p >= seuils[c])
            lo, hi = wilson(k, n)
            cases.append(f"{k} ({pct(k / n if n else 0)}, IC 95 % {pct(lo)} – {pct(hi)})")
        s.append(f"| {nom} | {doms} | {n} | " + " | ".join(cases) + " |")
    return s + [""]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=15, help="pages de sitemap par domaine")
    ap.add_argument("--corpus", default=str(RACINE / "data" / "corpus.csv"))
    args = ap.parse_args()

    chemin = M.DOSSIER_MODELES / "lgbm.joblib"
    verifier_empreinte(chemin)  # pickle : empreinte de models/SHA256SUMS avant chargement
    b = joblib.load(chemin)
    seuils = b["seuils"]

    doms = domaines_sn()
    print(f"{len(doms)} domaines en .sn dans Tranco ; sitemaps...", flush=True)
    vus = set()
    if Path(args.corpus).exists():
        vus = {F.domaine_enregistre(u) for u in pd.read_csv(args.corpus, dtype=str, keep_default_na=False).url}

    with ThreadPoolExecutor(8) as pool:
        cartes = dict(zip(doms, pool.map(lambda d: C.sitemap_domaine(d, args.pages), doms)))
    print(C.resume_incidents(), flush=True)

    brutes = []
    for d in doms:
        brutes.append((d, "https://" + d + "/"))
        brutes += [(d, C.nettoyer(t["url"])) for t in cartes.get(d) or []]
    probas = b["calib"].predict(b["booster"].predict(M.construire_X([u for _, u in brutes], b["vocab_tld"])))
    lignes = [(d, u, float(p)) for (d, u), p in zip(brutes, probas)]

    jamais_vus = [l for l in lignes if F.domaine_enregistre(l[1]) not in vus]
    deja_vus = [l for l in lignes if F.domaine_enregistre(l[1]) in vus]
    accueils = [l for l in jamais_vus if l[1] == "https://" + l[0] + "/"]
    par_suffixe = defaultdict(list)
    for l in jamais_vus:
        par_suffixe[suffixe(l[0])].append(l)

    # domaines les plus souvent classes a tort (seuil 90 %), sans chemin
    erreurs = defaultdict(int)
    for d, _, p in jamais_vus:
        if p >= seuils[0.9]:
            erreurs[d] += 1
    pire = sorted(erreurs.items(), key=lambda x: -x[1])[:15]

    s = ["# Faux positifs sur des sites sénégalais légitimes", "",
         f"Généré par `ml/mesure_sn.py` le {date.today().isoformat()}, avec le modèle publié (seuils fixés en "
         "validation, jamais ajustés ici). Population : les domaines en `.sn` de la liste Tranco, leur page d'accueil "
         f"et jusqu'à {args.pages} pages de leur sitemap. Intervalles de confiance de Wilson.", ""]
    s += tableau("Domaines jamais vus à l'entraînement", [("Toutes les pages", jamais_vus), ("Pages d'accueil", accueils)]
                 + [(f"Suffixe `{k}`", v) for k, v in sorted(par_suffixe.items(), key=lambda x: -len(x[1]))], seuils)
    if deja_vus:
        s += tableau("Domaines déjà présents dans le corpus d'entraînement (pour mémoire)", [("Toutes les pages", deja_vus)], seuils)
    # Diagnostic : meme pages, code de TLD remplace par celui de .com, rien d'autre ne change
    urls_jv = [u for _, u, _ in jamais_vus]
    X = M.construire_X(urls_jv, b["vocab_tld"])
    code_sn = b["vocab_tld"].get("sn", 0)
    X[:, -1] = b["vocab_tld"]["com"]
    p_com = b["calib"].predict(b["booster"].predict(X))
    i_marque = M.NOMS_COLONNES.index("marque_hors_domaine")
    fp90 = [p >= seuils[0.9] for _, _, p in jamais_vus]
    marque = sum(1 for k, f in enumerate(fp90) if f and X[k, i_marque] == 1)
    s += ["### Diagnostic", "",
          f"- L'extension `sn` {'a le code ' + str(code_sn) if code_sn else 'est absente'} du vocabulaire des TLD du modèle"
          + ("" if code_sn else " : elle tombe dans la case des extensions rares, que le corpus associe surtout au phishing") + ".",
          f"- Mêmes pages avec le code de `.com`, rien d'autre ne change : {sum(fp90)} → {int((p_com >= seuils[0.9]).sum())} "
          f"faux positifs au seuil « 90 % », {sum(1 for _, _, p in jamais_vus if p >= seuils[0.95])} → "
          f"{int((p_com >= seuils[0.95]).sum())} au seuil « 95 % ».",
          f"- {marque} des {sum(fp90)} faux positifs au seuil « 90 % » ont l'attribut « nom de marque hors de son vrai "
          "domaine » : la liste de marques ne connaît que les domaines français (par exemple `orange.fr`, pas `orange.sn`).",
          "- Correction prévue : ajouter des sites `.sn` légitimes et les marques sénégalaises au corpus, réentraîner, "
          "puis refaire cette mesure sur des domaines tenus à l'écart de l'entraînement.", ""]
    s += ["### Domaines les plus souvent signalés à tort (seuil « 90 % de rappel »)", ""]
    s += [f"- `{d}` : {k} page(s)" for d, k in pire] or ["Aucun."]
    s += ["", "Limites : Tranco ne classe qu'une partie des sites sénégalais (beaucoup sont en `.com`) ; "
          "un site très visité n'est pas forcément sain ; les pages de sitemap sont tirées au hasard.", ""]
    (RACINE / "reports" / "mesure_sn.md").write_text("\n".join(s), encoding="utf-8", newline="\n")
    print("\n".join(s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
