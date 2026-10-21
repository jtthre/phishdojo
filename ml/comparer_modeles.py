"""
Avant / apres le reentrainement senegalais -> reports/reentrainement_sn.md

Compare, a protocole identique :
  - l'ancien modele (chiffres publies dans reports/, calcules avec l'ancien features.py :
    le code des attributs a change, on ne peut donc pas le recalculer ici) ;
  - les nouveaux modeles, evalues sur le MEME test temporel que l'ancien (corpus d'origine,
    memes coupures), puis sur les pages .sn legitimes ajoutees a la periode de test ;
  - les mesures sur les 62 sites .sn tenus a l'ecart (mesure_sn.py) et l'ablation.

Usage (depuis ml/) :
    python comparer_modeles.py --variantes sn_marques:"Marques seules" sn:"Marques et pages .sn"
"""

import argparse
import json
import random
import re
import sys
from datetime import date
from pathlib import Path

import joblib
import numpy as np

import features as F
import modeles as M
import train as T
from augmenter_sn import reheberger_sn
from modeles import verifier_empreinte

RACINE = Path(__file__).resolve().parent


def pct(x, n=2):
    return f"{100 * x:.{n}f} %".replace(".", ",")


def charger_modele(dossier):
    chemin = RACINE / dossier / "lgbm.joblib"
    verifier_empreinte(chemin)  # pickle : empreinte du SHA256SUMS du dossier avant chargement
    return joblib.load(chemin)


def evaluer(b, urls, y):
    p = b["calib"].predict(b["booster"].predict(M.construire_X(urls, b["vocab_tld"])))
    return T.evaluer(p, np.asarray(y), b["seuils"])


def ligne_eval(nom, ev):
    s = {r["cible"]: r for r in ev["seuils"]}
    return (f"| {nom} | " + f"{ev['auc']:.4f}".replace(".", ",") + f" | {pct(ev.get('rappel_a_0.1pct_fp', float('nan')), 1)} | "
            + " | ".join(f"{pct(s[c]['tfp'])} [{pct(s[c]['tfp_bas'])} – {pct(s[c]['tfp_haut'])}], rappel {pct(s[c]['rappel'], 1)}"
                         for c in (0.8, 0.9, 0.95)) + " |")


def mesure_sn(fichier):
    """Ligne « Toutes les pages » des domaines jamais vus dans un rapport mesure_sn.md."""
    texte = (RACINE / fichier).read_text(encoding="utf-8")
    partie = texte.split("### Domaines jamais vus")[1]
    m = re.search(r"^\| Toutes les pages \| (\d+) \| (\d+) \| (.+?) \| (.+?) \| (.+?) \|$", partie, re.M)
    return m.groups()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variantes", nargs="+", required=True, help="dossier:libelle (models_<dossier>, reports_<dossier>)")
    ap.add_argument("--corpus", default=str(RACINE / "data" / "corpus.csv"))
    ap.add_argument("--corpus-sn", default=str(RACINE / "data" / "corpus_sn.csv"))
    args = ap.parse_args()
    variantes = [v.split(":", 1) for v in args.variantes]

    print("Test temporel d'origine...", flush=True)
    _, _, _, test, info = T.decouper(T.charger(args.corpus))
    _, _, _, test_sn, _ = T.decouper(T.charger(args.corpus_sn))
    leg_sn = test_sn[test_sn.source == "commoncrawl-sn"]

    ancien = json.loads((RACINE / "reports" / "metriques.json").read_text(encoding="utf-8"))["lgbm"]
    s = ["# Réentraînement avec le pack Sénégal : avant / après", "",
         f"Généré par `ml/comparer_modeles.py` le {date.today().isoformat()}. Même protocole pour tous : découpe "
         f"temporelle (test à partir du {info['t_test']}), seuils fixés en validation, intervalles de Wilson.", "",
         "## Test temporel d'origine (même population pour tous)", "",
         f"{info['test']['phishing']} phishing sur des domaines jamais vus, {info['test']['legitime']} légitimes.", "",
         "| Modèle | AUC | Rappel à 0,1 % de FP | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |",
         "| --- | --- | --- | --- | --- | --- |",
         ligne_eval("Ancien (publié)", ancien["eval"])]
    resultats = {}
    for dossier, libelle in variantes:
        b = charger_modele(f"models_{dossier}")
        resultats[dossier] = b
        s.append(ligne_eval(libelle, evaluer(b, test.url.tolist(), test.label.values)))

    s += ["", f"## Pages .sn légitimes de la période de test ({len(leg_sn)} pages de "
          f"{leg_sn.reg.nunique()} domaines, Common Crawl, jamais vues à l'entraînement)", "",
          "| Modèle | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |", "| --- | --- | --- | --- |"]
    for dossier, libelle in variantes:
        b = resultats[dossier]
        p = b["calib"].predict(b["booster"].predict(M.construire_X(leg_sn.url.tolist(), b["vocab_tld"])))
        cases = []
        for c in (0.8, 0.9, 0.95):
            k = int((p >= b["seuils"][c]).sum())
            lo, hi = T.wilson(k, len(p))
            cases.append(f"{k} ({pct(k / len(p))}, IC {pct(lo)} – {pct(hi)})")
        s.append(f"| {libelle} | " + " | ".join(cases) + " |")

    s += ["", "## Les 62 sites .sn tenus à l'écart (`mesure_sn_domaines.txt`, mêmes pages qu'avant)", "",
          "| Modèle | Pages | Faux positifs au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |", "| --- | --- | --- | --- | --- |"]
    _, n, a, b9, c = mesure_sn("reports/mesure_sn.md")
    s.append(f"| Ancien (publié) | {n} | {a} | {b9} | {c} |")
    for dossier, libelle in variantes:
        f = Path(f"reports_{dossier}") / "mesure_sn.md"
        if (RACINE / f).exists():
            _, n, a, b9, c = mesure_sn(f)
            s.append(f"| {libelle} | {n} | {a} | {b9} | {c} |")

    # Le revers possible : un modele qui croit « .sn = legitime ». Phishing du test (jamais vu),
    # extension remplacee par .sn : la structure d'une vraie attaque, sur un domaine .sn.
    rng = random.Random(7)
    ph = [reheberger_sn(u, rng) for u in test[test.label == 1].url]
    ph = [u for u in ph if u]
    s += ["", f"## Phishing du test temporel réhébergé en .sn ({len(ph)} URL, extension remplacée par `.sn` "
          "ou `.com.sn`, jamais vues à l'entraînement)", "",
          "Mesure le revers d'un modèle qui croirait « `.sn` = légitime ».", "",
          "| Modèle | Rappel au seuil « 80 % » | au seuil « 90 % » | au seuil « 95 % » |", "| --- | --- | --- | --- |"]
    for dossier, libelle in variantes:
        b = resultats[dossier]
        p = b["calib"].predict(b["booster"].predict(M.construire_X(ph, b["vocab_tld"])))
        s.append(f"| {libelle} | " + " | ".join(pct(float((p >= b['seuils'][c]).mean()), 1) for c in (0.8, 0.9, 0.95)) + " |")
    s.append("")
    s.append("À comparer au rappel sur le phishing d'origine (premier tableau : environ 82, 90 et 95 %).")

    s += ["", "## Ablation (seuil « 90 % » du modèle, * = classé phishing)", "",
          "| Domaine | " + " | ".join(f"{l} : vrai / imitation" for _, l in variantes) + " |",
          "| --- | " + " | ".join("---" for _ in variantes) + " |"]
    for nom, vrai, faux in F.PAIRES_ABLATION:
        cases = []
        for dossier, _ in variantes:
            b = resultats[dossier]
            pv, pf = b["calib"].predict(b["booster"].predict(M.construire_X(["https://" + vrai, "https://" + faux], b["vocab_tld"])))
            t = b["seuils"][0.9]
            cases.append(f"{pv:.2f}{'*' if pv >= t else ''} / {pf:.2f}{'*' if pf >= t else ''}".replace(".", ","))
        s.append(f"| {nom} | " + " | ".join(cases) + " |")

    (RACINE / "reports" / "reentrainement_sn.md").write_text("\n".join(s) + "\n", encoding="utf-8", newline="\n")
    print("\n".join(s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
