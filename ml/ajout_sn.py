"""
Ajout au corpus : pages .sn legitimes et typosquats des marques senegalaises -> data/corpus_sn.csv

Mesure de depart (reports/mesure_sn.md) : 17 % de faux positifs au seuil « 90 % » sur des
pages .sn legitimes, parce que l'extension sn n'apparaissait presque pas dans le corpus.
Ce script part du corpus existant (data/corpus.csv, inchange) et n'ajoute que :
  - des pages .sn legitimes datees, tirees de l'index Common Crawl dans des collectes
    reparties sur les trois periodes (entrainement, validation, test) ;
  - des typosquats des marques senegalaises (features.MARQUES_SN), habilles de chemins de
    vrais phishing anciens, comme collect.py le fait pour les autres marques.
Sont exclus : les domaines de la mesure (mesure_sn_domaines.txt), ceux de l'ablation, les
domaines deja vus dans du phishing et les hebergeurs partages (blogspot.sn...).
Toute difference de resultat avec le modele precedent vient donc de ces ajouts.

Usage (depuis ml/, apres collect.py) :
    python ajout_sn.py                    # 30 min a 1 h : l'index Common Crawl est lent
    python train.py --corpus data/corpus_sn.csv --sortie sn
"""

import argparse
import csv
import json
import random
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

import collect as C
import features as F
import mesure_sn as S

RACINE = Path(__file__).resolve().parent
DATA = RACINE / "data"
CACHE = DATA / "raw" / "cc_sn"


def coupures(df):
    """Memes dates de coupure que train.decouper() : elles ne dependent que du phishing date."""
    dph = sorted(df[(df.first_seen != "") & (df.synthetique == "0") & (df.label == "1")].first_seen)
    return dph[int(len(dph) * 0.70)], dph[int(len(dph) * 0.85)]


def choisir_collectes(t_val, t_test, nb_train, nb_val, nb_test):
    """Collectes Common Crawl reparties sur les trois periodes, a intervalles reguliers."""
    infos = C.collectes_cc("2024-10-01", 200)
    def tirer(liste, n):
        if len(liste) <= n:
            return liste
        pas = (len(liste) - 1) / (n - 1) if n > 1 else 0
        return [liste[round(i * pas)] for i in range(n)]
    jour = lambda c: c["from"][:10]  # noqa: E731
    return (tirer([c for c in infos if jour(c) < t_val], nb_train)
            + tirer([c for c in infos if t_val <= jour(c) < t_test], nb_val)
            + tirer([c for c in infos if jour(c) >= t_test], nb_test))


def pages_sn(collecte, nb_pages, rng):
    """Captures HTML reussies de tout le .sn, sur nb_pages pages tirees de l'index."""
    base = collecte["cdx-api"] + "?url=sn&matchType=domain&output=json"
    n = C.http_get(base + "&showNumPages=true", timeout=60, essais=3)
    try:
        total = int(json.loads(n)["pages"]) if n else 0
    except (ValueError, KeyError, TypeError):
        total = 0
    out = []
    for p in rng.sample(range(total), min(nb_pages, total)):
        cache = CACHE / f"{collecte['id']}__{p}.jsonl"
        lignes = C._lire_cache(cache)
        if lignes is None:
            txt = C.http_get(base + f"&page={p}&fl=url,timestamp,status,mime", timeout=180, essais=4)
            if txt is None:
                C.log(f"    {collecte['id']} page {p} : index injoignable, ignoree")
                continue
            lignes = []
            for l in txt.splitlines():
                try:
                    o = json.loads(l)
                except json.JSONDecodeError:
                    continue
                if o.get("status") == "200" and "html" in o.get("mime", ""):
                    lignes.append({"url": o["url"], "timestamp": o["timestamp"]})
            C._ecrire_cache(cache, lignes)
            time.sleep(2.0)  # politesse envers l'index
        out += lignes
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(DATA / "corpus.csv"))
    ap.add_argument("--sortie", default=str(DATA / "corpus_sn.csv"))
    ap.add_argument("--collectes", default="4,2,2", help="collectes entrainement,validation,test")
    ap.add_argument("--pages-par-collecte", type=int, default=3)
    ap.add_argument("--par-domaine", type=int, default=12, help="pages par domaine et par collecte")
    ap.add_argument("--max-par-domaine", type=int, default=40, help="pages par domaine au total")
    ap.add_argument("--typos-par-marque", type=int, default=60)
    args = ap.parse_args()
    rng = random.Random(2026)
    random.seed(2026)

    df = pd.read_csv(args.corpus, dtype=str, keep_default_na=False)
    t_val, t_test = coupures(df)
    C.log(f"Corpus de depart : {len(df)} URL ; coupures {t_val} / {t_test}")

    mesure = set(S.domaines_sn())
    phish = {F.domaine_enregistre(u) for u in df[df.label == "1"].url}
    exclus = mesure | F.DOMAINES_ABLATION
    nb = [int(x) for x in args.collectes.split(",")]
    colls = choisir_collectes(t_val, t_test, *nb)
    C.log(f"Collectes : {', '.join(c['id'] for c in colls)}")

    # 1. Pages .sn legitimes, datees par leur capture
    ajout, total_dom, raisons = [], Counter(), Counter()
    for c in colls:
        par_dom = Counter()
        captures = pages_sn(c, args.pages_par_collecte, rng)
        rng.shuffle(captures)
        for cap in captures:
            u = C.nettoyer(cap["url"])
            if not u.lower().startswith(("http://", "https://")) or len(u) > 2000:
                raisons["schema ou longueur"] += 1
                continue
            d = F.decouper(u)
            enreg, suffixe, prive = d[4], d[6], d[7]
            if not suffixe.split(".")[-1] == "sn":
                raisons["hors .sn"] += 1
            elif enreg in exclus:
                raisons["mesure ou ablation"] += 1
            elif enreg in phish:
                raisons["domaine vu en phishing"] += 1
            elif prive:
                raisons["hebergeur partage"] += 1
            elif par_dom[enreg] >= args.par_domaine or total_dom[enreg] >= args.max_par_domaine:
                raisons["plafond par domaine"] += 1
            else:
                par_dom[enreg] += 1
                total_dom[enreg] += 1
                ts = cap["timestamp"]
                ajout.append((u, "0", f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}", "commoncrawl-sn"))
        C.log(f"  {c['id']} : {len(captures)} captures, {sum(par_dom.values())} pages gardees")
    C.log(C.resume_incidents())

    # 2. Typosquats des marques senegalaises (chemins de vrais phishing anciens, comme collect.py)
    op = df[(df.source == "openphish") & (df.first_seen != "")]
    coupure = sorted(op.first_seen)[int(len(op) * 0.7)]
    chemins = []
    for u in op[op.first_seen < coupure].url:
        _, sep, apres = F.retirer_schema(u).partition("/")
        if sep and apres:
            chemins.append("/" + apres)
    typos = []
    for m in [m for m in F.MARQUES_SN if m not in F.DOMAINES_ABLATION]:
        vs = C._variantes(m)
        random.shuffle(vs)
        for d in vs[:args.typos_par_marque]:
            if any(ord(ch) > 127 for ch in d) and random.random() < 0.5:
                try:
                    d = d.encode("idna").decode("ascii")
                except UnicodeError:
                    pass
            chemin = random.choice(chemins) if chemins and random.random() < 0.85 else "/"
            sous = random.choice(["", "", "www.", "secure.", "login.", "account."])
            typos.append((random.choice(["https://", "https://", "http://"]) + sous + d + chemin, "1", "", "synthetique"))

    # 3. Assemblage : le corpus existant reste tel quel, les ajouts deja presents sont ignores
    connus = dict(zip(df.url, df.label))
    nouveaux, conflits = {}, 0
    for u, lab, date, src in ajout + typos:
        if F.domaine_enregistre(u) in F.DOMAINES_ABLATION:
            continue
        if u in connus or u in nouveaux:
            conflits += int(connus.get(u, nouveaux.get(u, (lab,))[0]) != lab)
            continue
        nouveaux[u] = (lab, date, src)
    with open(args.sortie, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "label", "first_seen", "source", "synthetique"])
        for r in df.itertuples(index=False):
            w.writerow([r.url, r.label, r.first_seen, r.source, r.synthetique])
        for u, (lab, date, src) in nouveaux.items():
            w.writerow([u, lab, date, src, int(src == "synthetique")])

    periodes = Counter("entrainement" if d < t_val else ("validation" if d < t_test else "test")
                       for _, (lab, d, s) in nouveaux.items() if s == "commoncrawl-sn")
    C.log(f"\nPages .sn legitimes ajoutees : {sum(periodes.values())} sur {len(total_dom)} domaines "
          f"({', '.join(f'{k} {v}' for k, v in sorted(periodes.items()))})")
    C.log(f"Typosquats senegalais ajoutes : {sum(1 for v in nouveaux.values() if v[2] == 'synthetique')}")
    C.log(f"Ecartees : {dict(raisons)} ; doublons ou etiquettes contradictoires : {conflits}")
    C.log(f"Ecrit dans {Path(args.sortie).name} : {len(df) + len(nouveaux)} URL. "
          "Etape suivante : python train.py --corpus data/corpus_sn.csv --sortie sn")
    return 0


if __name__ == "__main__":
    sys.exit(main())
