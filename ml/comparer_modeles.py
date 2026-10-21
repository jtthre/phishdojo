"""
Avant / apres le reentrainement senegalais -> reports/reentrainement_sn.md

Chaque modele est recalcule avec SON code d'attributs : l'ancien modele et son features.py
sont extraits de git (--ancien, un commit), les variantes viennent de models_<nom>/ avec le
code actuel. Tous sont mesures sur les memes populations :
  - VALIDATION (choix de la variante) : pages .sn
    legitimes et pages d'accueil en www. de la periode de validation, phishing de la
    validation reheberge en .sn ;
  - TEST (rapporte seulement) : test temporel d'origine, pages d'accueil en www. du test,
    pages .sn legitimes du test, phishing du test reheberge en .sn ;
  - les sites .sn de mesure_sn_domaines.txt jamais vus a l'entrainement (pages de sitemap
    et pages d'accueil sous les deux formes) ; ils ont servi a decouvrir le probleme, pas a
    choisir la variante ;
  - l'ablation.

Regle de choix : parmi les candidats (--candidats), celui qui detecte le plus de phishing
reheberge en .sn au seuil « 90 % » en validation, a condition de rester sous 3 % de faux
positifs au seuil « 90 % » sur les pages .sn legitimes ET sur les pages d'accueil en www. de
la validation. Elle a ete fixee sur la validation APRES les resultats de la premiere version
(le seuil de 3 % reprend le critere de cette premiere version) ; la validation sert aussi a
l'arret precoce, a la calibration et aux seuils, donc ses taux sont optimistes.

--ancien doit etre un commit deja fusionne dans main : son code et son modele (pickle) sont
charges, et le SHA256SUMS qui les accompagne ne protege que de la corruption.

Usage (depuis ml/) :
    python comparer_modeles.py --ancien 5b3a1fa --variantes final:B w_aug3000:D --candidats final w_aug3000
"""

import argparse
import random
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import collect as C
import features as F
import mesure_sn as S
import train as T
from augmenter_sn import reheberger_sn
from modeles import verifier_empreinte

RACINE = Path(__file__).resolve().parent
CIBLES = (0.8, 0.9, 0.95)


def pct(x, n=2):
    return f"{100 * x:.{n}f} %".replace(".", ",")


def importer_modeles(dossier_code):
    """Charge modeles.py (et son features.py) depuis dossier_code, sans toucher aux modules
    du code actuel. Le module renvoye garde sa propre version de features."""
    sauve = {k: sys.modules.pop(k) for k in ("features", "modeles") if k in sys.modules}
    sys.path.insert(0, str(dossier_code))
    try:
        import modeles as mod  # noqa: PLC0415
    finally:
        sys.path.pop(0)
        for k in ("features", "modeles"):
            sys.modules.pop(k, None)
        sys.modules.update(sauve)
    return mod


class Variante:
    def __init__(self, nom, libelle, ref=None):
        self.nom, self.libelle = nom, libelle
        d = None
        if ref:  # ancien modele et ancien code, depuis git : seulement un commit deja fusionne dans main
            fusionne = subprocess.run(["git", "merge-base", "--is-ancestor", ref, "origin/main"], cwd=RACINE)
            if fusionne.returncode != 0:
                raise SystemExit(f"--ancien {ref} : pas un commit de origin/main, son code ne sera pas execute")
            d = Path(tempfile.mkdtemp(prefix="pds-ancien-"))
            (d / "models").mkdir()
            for f in ("features.py", "modeles.py", "models/lgbm.joblib", "models/SHA256SUMS"):
                (d / f).write_bytes(subprocess.run(["git", "show", f"{ref}:ml/{f}"], cwd=RACINE,
                                                   check=True, capture_output=True).stdout)
            code, chemin = d, d / "models" / "lgbm.joblib"
        else:
            code, chemin = RACINE, RACINE / f"models_{nom}" / "lgbm.joblib"
        self.M = importer_modeles(code)
        verifier_empreinte(chemin)  # pickle : empreinte du SHA256SUMS du dossier avant chargement
        self.b = joblib.load(chemin)
        self.seuils = self.b["seuils"]
        if d:  # code et modele sont en memoire : le dossier temporaire ne sert plus
            shutil.rmtree(d, ignore_errors=True)

    def proba(self, urls):
        if not len(urls):
            return np.zeros(0)
        X = self.M.construire_X(list(urls), self.b["vocab_tld"])
        return self.b["calib"].predict(self.b["booster"].predict(X))


def case_fp(p, seuil):
    k, n = int((p >= seuil).sum()), len(p)
    lo, hi = T.wilson(k, n)
    return f"{k} / {n} ({pct(k / n if n else 0)}, IC {pct(lo)} – {pct(hi)})"


def tableau_fp(titre, note, variantes, urls, cibles=(0.8, 0.9)):
    s = [f"### {titre}", "", note, "", "| Modèle | " + " | ".join(f"Faux positifs au seuil « {int(c * 100)} % »" for c in cibles) + " |",
         "| --- | " + " | ".join("---" for _ in cibles) + " |"]
    for v in variantes:
        p = v.proba(urls)
        s.append(f"| {v.libelle} | " + " | ".join(case_fp(p, v.seuils[c]) for c in cibles) + " |")
    return s + [""]


def tableau_rappel(titre, note, variantes, urls):
    s = [f"### {titre}", "", note, "", "| Modèle | " + " | ".join(f"Rappel au seuil « {int(c * 100)} % »" for c in CIBLES) + " |",
         "| --- | " + " | ".join("---" for _ in CIBLES) + " |"]
    res = {}
    for v in variantes:
        p = v.proba(urls)
        res[v.nom] = {c: float((p >= v.seuils[c]).mean()) for c in CIBLES}
        s.append(f"| {v.libelle} | " + " | ".join(pct(res[v.nom][c], 1) for c in CIBLES) + " |")
    return s + [""], res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ancien", default="5b3a1fa", help="commit du modele publie avant le pack Senegal")
    ap.add_argument("--variantes", nargs="+", required=True, help="nom:libelle (models_<nom>/)")
    ap.add_argument("--candidats", nargs="+", required=True, help="variantes du pack Senegal soumises a la regle de choix")
    ap.add_argument("--corpus-origine", default=str(RACINE / "data" / "corpus.csv"))
    ap.add_argument("--corpus", default=str(RACINE / "data" / "corpus_sn_www.csv"),
                    help="corpus final SANS augmentation : populations de validation et de test communes")
    ap.add_argument("--sortie", default=str(RACINE / "reports" / "reentrainement_sn.md"))
    args = ap.parse_args()

    ancien = Variante("ancien", "Ancien modèle (publié)", args.ancien)
    variantes = [Variante(*v.split(":", 1)) for v in args.variantes]
    tous = [ancien] + variantes

    print("Decoupes...", flush=True)
    _, _, _, test_o, info = T.decouper(T.charger(args.corpus_origine))
    _, val_es, val_cal, test, _ = T.decouper(T.charger(args.corpus))
    val = pd.concat([val_es, val_cal])
    leg = lambda d, src: d[(d.label == 0) & (d.source == src)]  # noqa: E731
    www = lambda d: d[(d.label == 0) & d.source.str.endswith("-www")]  # noqa: E731
    rng = random.Random(7)
    sn_val = [u for u in (reheberger_sn(u, rng) for u in val[val.label == 1].url) if u]
    sn_test = [u for u in (reheberger_sn(u, rng) for u in test_o[test_o.label == 1].url) if u]

    s = ["# Réentraînement avec le pack Sénégal : avant / après", "",
         f"Généré par `ml/comparer_modeles.py` le {date.today().isoformat()}. Chaque modèle est recalculé avec son propre code "
         f"d'attributs (l'ancien est extrait de git, commit `{args.ancien}`). Découpe temporelle (validation du {info['t_val']}, "
         f"test à partir du {info['t_test']}), seuils de chaque modèle fixés sur sa validation, intervalles de Wilson.", "",
         "Règle de choix, appliquée sur la **validation** (le test n'a servi qu'à rapporter) : parmi les quatre candidats du pack "
         "Sénégal (B à E), celui qui détecte le plus de phishing réhébergé en `.sn` au seuil « 90 % », à condition de rester sous "
         "3 % de faux positifs au seuil « 90 % » sur les pages `.sn` légitimes et sur les pages d'accueil en `www.` de la validation. "
         "Elle a été fixée après les résultats de la première version (le seuil de 3 % reprend son critère), et la validation sert "
         "aussi à l'arrêt précoce, à la calibration et aux seuils : ses taux sont optimistes, ceux du test font foi.", "",
         "## 1. Validation (choix de la variante)", ""]
    s += tableau_fp("Pages `.sn` légitimes de la validation", f"{len(leg(val, 'commoncrawl-sn'))} pages Common Crawl.",
                    tous, leg(val, "commoncrawl-sn").url.tolist())
    s += tableau_fp("Pages d'accueil légitimes en `www.` de la validation", f"{len(www(val))} pages.", tous, www(val).url.tolist())
    t, rappel_val = tableau_rappel("Phishing de la validation réhébergé en `.sn`", f"{len(sn_val)} URL.", tous, sn_val)
    s += t
    fp_val = {}
    for v in variantes:
        p1 = v.proba(leg(val, "commoncrawl-sn").url.tolist())
        p2 = v.proba(www(val).url.tolist())
        fp_val[v.nom] = max(float((p1 >= v.seuils[0.9]).mean()), float((p2 >= v.seuils[0.9]).mean()))
    admis = [v for v in variantes if v.nom in args.candidats and fp_val[v.nom] <= 0.03]
    choisi = max(admis, key=lambda v: rappel_val[v.nom][0.9]) if admis else None
    s += [f"**Variante retenue par la règle : {choisi.libelle if choisi else 'aucune'}.**", ""]

    s += ["## 2. Test (rapporté, jamais utilisé pour choisir)", ""]
    ev = ["| Modèle | AUC | Rappel à 0,1 % de FP | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |",
          "| --- | --- | --- | --- | --- | --- |"]
    for v in tous:
        e = T.evaluer(v.proba(test_o.url.tolist()), test_o.label.values, v.seuils)
        r = {x["cible"]: x for x in e["seuils"]}
        ev.append(f"| {v.libelle} | " + f"{e['auc']:.4f}".replace(".", ",") + f" | {pct(e.get('rappel_a_0.1pct_fp', 0), 1)} | "
                  + " | ".join(f"{pct(r[c]['tfp'])} [{pct(r[c]['tfp_bas'])} – {pct(r[c]['tfp_haut'])}], rappel {pct(r[c]['rappel'], 1)}" for c in CIBLES) + " |")
    s += ["### Test temporel d'origine", "",
          f"Même population que l'ancien rapport : {info['test']['phishing']} phishing sur des domaines jamais vus, "
          f"{info['test']['legitime']} légitimes (pages d'accueil sans `www.`, comme le corpus d'origine).", ""] + ev + [""]
    s += ["### Seuils de chaque modèle (fixés sur sa validation)", "",
          "Corriger l'artefact retire du phishing « facile » : pour garder 90 % de rappel, le seuil « 90 % » descend, et toutes "
          "les pages légitimes en paient le prix.", "",
          "| Modèle | Seuil « 80 % » | Seuil « 90 % » | Seuil « 95 % » |", "| --- | --- | --- | --- |"]
    s += [f"| {v.libelle} | " + " | ".join(f"{v.seuils[c]:.3f}".replace(".", ",") for c in CIBLES) + " |" for v in tous] + [""]
    s += ["### Pages légitimes du test, par source", "",
          "Faux positifs au seuil « 90 % » (niveau « Douteux » de la page Vérifier), puis au seuil « 80 % » (« Arnaque probable »).", "",
          "| Source | Pages | " + " | ".join(v.libelle for v in tous) + " |", "| --- | --- | " + " | ".join("---" for _ in tous) + " |"]
    sources = [("Pages profondes de sites français (`sitemap-fr`, en `www.`)", "sitemap-fr"),
               ("Pages profondes de sites internationaux (`sitemap-intl`)", "sitemap-intl"),
               ("Pages d'accueil sans `www.` (`tranco-accueil`)", "tranco-accueil"),
               ("Pages d'accueil en `www.` (dérivées)", "tranco-accueil-www"),
               ("Pages `.sn` (Common Crawl)", "commoncrawl-sn")]
    for titre, src in sources:
        urls = test[(test.label == 0) & (test.source == src)].url.tolist()
        cases = []
        for v in tous:
            p = v.proba(urls)
            cases.append(f"{pct(float((p >= v.seuils[0.9]).mean()), 1)} / {pct(float((p >= v.seuils[0.8]).mean()), 1)}" if len(p) else "—")
        s.append(f"| {titre} | {len(urls)} | " + " | ".join(cases) + " |")
    s.append("")
    s += tableau_fp("Pages d'accueil légitimes en `www.` du test", f"{len(www(test))} pages : ce que le test d'origine ne voyait pas.",
                    tous, www(test).url.tolist(), CIBLES)
    s += tableau_fp("Pages `.sn` légitimes du test", f"{len(leg(test, 'commoncrawl-sn'))} pages Common Crawl de "
                    f"{leg(test, 'commoncrawl-sn').reg.nunique()} domaines, jamais vues à l'entraînement.",
                    tous, leg(test, "commoncrawl-sn").url.tolist(), CIBLES)
    t, _ = tableau_rappel("Phishing du test réhébergé en `.sn`", f"{len(sn_test)} URL réelles du test, extension remplacée par "
                          "`.sn` ou `.com.sn` : un substitut, faute de vrai phishing `.sn` (43 URL dans tout le corpus).", tous, sn_test)
    s += t

    # Les sites .sn de la mesure (pages de sitemap en cache + pages d'accueil sous les deux formes)
    vus = set(T.charger(args.corpus_origine).reg)
    pages = []
    for d in S.domaines_sn():
        if d in vus:
            continue
        pages += ["https://" + d + "/", "https://www." + d + "/"]
        pages += [C.nettoyer(x["url"]) for x in (C.sitemap_domaine(d, 15) or [])]
    s += tableau_fp("Les sites `.sn` de `mesure_sn_domaines.txt` absents du corpus", f"{len(pages)} pages : pages de sitemap et "
                    "pages d'accueil sous les deux formes. Ces sites ont servi à découvrir le problème et à régler les premières "
                    "variantes : chiffres indicatifs.", tous, pages, CIBLES)

    s += ["## 3. Ablation (seuil « 90 % » de chaque modèle, * = classé phishing)", "",
          "| Domaine | " + " | ".join(f"{v.libelle} : vrai / imitation" for v in tous) + " |", "| --- | " + " | ".join("---" for _ in tous) + " |"]
    for nom, vrai, faux in F.PAIRES_ABLATION:
        cases = []
        for v in tous:
            pv, pf = v.proba(["https://" + vrai, "https://" + faux])
            t9 = v.seuils[0.9]
            cases.append(f"{pv:.2f}{'*' if pv >= t9 else ''} / {pf:.2f}{'*' if pf >= t9 else ''}".replace(".", ","))
        s.append(f"| {nom} | " + " | ".join(cases) + " |")

    Path(args.sortie).write_text("\n".join(s) + "\n", encoding="utf-8", newline="\n")
    print("\n".join(s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
