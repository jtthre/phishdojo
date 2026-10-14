"""
Entrainement et evaluation honnete -> models/ et reports/rapport.md

Protocole (phases 3 et 4 de la feuille de route) :
  - decoupe TEMPORELLE : on entraine sur le passe, on teste sur les dernieres semaines ;
  - phishing du test sur des domaines JAMAIS vus a l'entrainement (campagnes nouvelles) ;
  - seuils choisis sur la validation, mesures une seule fois sur le test ;
  - metriques au taux de base reel (1 pour 1000) : alertes par jour, pas exactitude ;
  - meme modele en decoupe ALEATOIRE, pour publier l'ecart ;
  - ablation des 6 domaines tenus a l'ecart du corpus.

Usage :
    python train.py                 # LightGBM + CNN (GPU si disponible)
    python train.py --bert          # + comparaison avec le BERT de reference
    python train.py --sans-cnn      # LightGBM seul (quelques minutes, CPU)
"""

import argparse
import json
import math
import re
import time
from datetime import date
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

import features as F
import modeles as M

RACINE = Path(__file__).resolve().parent
PI = 0.001          # taux de base : 1 phishing pour 1000 URL
VOLUME = 100_000    # URL vues par jour
CIBLES = (0.80, 0.90, 0.95)
RNG = np.random.default_rng(42)


def log(*a):
    print(*a, flush=True)


def wilson(k, n, z=1.96):
    """Intervalle de confiance a 95 % d'une proportion — indispensable quand le
    taux de faux positifs se joue a quelques URL pres."""
    if n == 0:
        return 0.0, 1.0
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - m), min(1.0, c + m)


# --------------------------------------------------------------------------
# Donnees
# --------------------------------------------------------------------------

def charger(chemin):
    df = pd.read_csv(chemin, dtype={"first_seen": str, "url": str},
                     keep_default_na=False)
    df = df[df.url.str.len() > 0].copy()
    df["label"] = df.label.astype(int)
    df["synthetique"] = df.synthetique.astype(int)
    df["reg"] = [F.domaine_enregistre(u) for u in df.url]
    return df


def decouper(df, f_val=0.15, f_test=0.15):
    datees = df[(df.first_seen != "") & (df.synthetique == 0)]
    dph = np.sort(datees[datees.label == 1].first_seen.values)
    if len(dph) < 200:
        raise SystemExit("Moins de 200 phishing dates : relance collect.py avec Git installe.")
    t_val = dph[int(len(dph) * (1 - f_val - f_test))]
    t_test = dph[int(len(dph) * (1 - f_test))]

    date_ok = (df.first_seen != "") & (df.synthetique == 0)
    est_test = date_ok & (df.first_seen >= t_test)
    est_val = date_ok & (df.first_seen >= t_val) & (df.first_seen < t_test)
    train, val, test = df[~est_test & ~est_val], df[est_val], df[est_test]

    # Phishing de validation et de test : domaines absents de l'entrainement.
    doms_train = set(train.reg)
    n_av = (test.label == 1).sum()
    test = test[(test.label == 0) | ~test.reg.isin(doms_train)]
    val = val[(val.label == 0) | ~val.reg.isin(doms_train)]
    retires = n_av - (test.label == 1).sum()

    # Validation coupee en deux, par classe : arret precoce / calibration + seuils.
    val = val.sample(frac=1.0, random_state=42)
    moities = []
    for lab in (0, 1):
        v = val[val.label == lab]
        moities.append((v.iloc[: len(v) // 2], v.iloc[len(v) // 2:]))
    val_es = pd.concat([moities[0][0], moities[1][0]])
    val_cal = pd.concat([moities[0][1], moities[1][1]])

    info = {"t_val": t_val, "t_test": t_test, "phishing_test_retires_domaine_connu": int(retires)}
    for nom, d in (("train", train), ("val_arret", val_es), ("val_calib", val_cal), ("test", test)):
        info[nom] = {"phishing": int((d.label == 1).sum()), "legitime": int((d.label == 0).sum())}
        if nom != "train" and info[nom]["legitime"] < 300:
            log(f"  ! seulement {info[nom]['legitime']} legitimes dans {nom} : le taux de faux "
                "positifs sera imprecis. Augmente --par-domaine dans collect.py.")
    return train, val_es, val_cal, test, info


# --------------------------------------------------------------------------
# Evaluation
# --------------------------------------------------------------------------

def seuils_validation(p, y):
    """Seuil atteignant chaque rappel cible SUR LA VALIDATION."""
    ph = np.sort(p[y == 1])[::-1]
    out = {}
    for r in CIBLES:
        k = max(1, math.ceil(r * len(ph)))
        out[r] = float(ph[k - 1]) if len(ph) else 0.5
    return out


def evaluer(p, y, seuils):
    res = {"auc": float(roc_auc_score(y, p)) if len(set(y)) == 2 else float("nan"), "seuils": []}
    n0 = int((y == 0).sum())
    for r, t in seuils.items():
        R = float((p[y == 1] >= t).mean()) if (y == 1).any() else 0.0
        fp = int((p[y == 0] >= t).sum())
        fpr = fp / n0 if n0 else 0.0
        lo, hi = wilson(fp, n0)
        prec = R * PI / (R * PI + fpr * (1 - PI)) if (R + fpr) > 0 else 0.0
        res["seuils"].append({
            "cible": r, "seuil": t, "rappel": R, "fp": fp, "n_legit": n0,
            "tfp": fpr, "tfp_bas": lo, "tfp_haut": hi, "precision_reelle": prec,
            "alertes_jour": VOLUME * (PI * R + (1 - PI) * fpr),
            "alertes_jour_haut": VOLUME * (PI * R + (1 - PI) * hi),
        })
    # Point de la courbe ROC : rappel a 0,1 % de faux positifs (descriptif).
    leg = np.sort(p[y == 0])[::-1]
    if len(leg):
        t01 = leg[max(0, int(0.001 * len(leg)) - 1)] + 1e-12
        res["rappel_a_0.1pct_fp"] = float((p[y == 1] >= t01).mean())
    return res


def sous_groupes(p, test, train_regs, seuil):
    leg = test.label.values == 0
    fr = leg & (test.reg.str.endswith(".fr").values | pd.Series(test.source.values).str.endswith("-fr").values)
    inconnus = leg & ~test.reg.isin(train_regs).values
    # Domaine nu (https://site.fr/) : sans pages d'accueil legitimes au corpus, ce sous-groupe
    # serait vide et le biais « pas de chemin = phishing » invisible.
    nus = leg & np.array([not re.sub(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", "", u).partition("/")[2].strip("/")
                          and "?" not in u for u in test.url.values])
    out = {}
    for nom, m in (("legitimes francais", fr), ("legitimes de domaines jamais vus", inconnus),
                   ("pages d'accueil legitimes (domaine nu)", nus)):
        n = int(m.sum())
        k = int((p[m] >= seuil).sum())
        lo, hi = wilson(k, n)
        out[nom] = {"n": n, "fp": k, "tfp": k / n if n else 0.0, "bas": lo, "haut": hi}
    return out


def ablation(fn_proba, seuil):
    urls = []
    for _, vrai, typo in F.PAIRES_ABLATION:
        urls += ["https://" + vrai, "http://" + vrai, "https://" + typo, "http://" + typo]
    p = np.asarray(fn_proba(urls))
    lignes, ref_ok, http_b, typo_b = [], 0, 0, 0
    for i, (nom, _, _) in enumerate(F.PAIRES_ABLATION):
        a, b, c, d = p[4 * i: 4 * i + 4]
        lignes.append([nom, float(a), float(b), float(c), float(d)])
        if a < seuil:
            ref_ok += 1
            http_b += int(b >= seuil)
            typo_b += int(c >= seuil)
    return {"lignes": lignes, "ref_ok": ref_ok, "http_bascule": http_b, "typo_bascule": typo_b,
            "seuil": seuil}


# --------------------------------------------------------------------------
# LightGBM
# --------------------------------------------------------------------------

def vocab_tld(urls, n=150):
    from collections import Counter
    c = Counter(M.tld(u) for u in urls)
    return {t: i + 1 for i, (t, _) in enumerate(c.most_common(n)) if t}


def entrainer_lgbm(Xtr, ytr, Xes, yes):
    pos, neg = (ytr == 1).sum(), (ytr == 0).sum()
    params = {
        "objective": "binary", "metric": "auc", "learning_rate": 0.05, "num_leaves": 63,
        "min_child_samples": 40, "bagging_fraction": 0.8, "bagging_freq": 1,
        "feature_fraction": 0.9, "scale_pos_weight": neg / max(pos, 1),
        "seed": 42, "verbose": -1,
    }
    cat = [len(M.NOMS_COLONNES) - 1]
    d_tr = lgb.Dataset(Xtr, ytr, feature_name=M.NOMS_COLONNES, categorical_feature=cat)
    d_es = lgb.Dataset(Xes, yes, reference=d_tr)
    return lgb.train(params, d_tr, num_boost_round=3000, valid_sets=[d_es],
                     callbacks=[lgb.early_stopping(100, verbose=False)])


def comparaison_decoupes(df, vocab, t_val, t_test):
    """Meme modele, MEME population, deux decoupes.

    Population : les URL datees et reelles uniquement. Le corpus historique non date
    et les typosquats synthetiques sont exclus des deux cotes : ils ne peuvent pas etre
    places dans le temps, et les inclure d'un seul cote changerait la difficulte du test
    au lieu de mesurer la fuite. Les deux decoupes ont les memes tailles d'entrainement
    et de validation ; seule la facon de tirer les URL change."""
    pool = df[(df.first_seen != "") & (df.synthetique == 0)]
    tr_t = pool[pool.first_seen < t_val]
    es_t = pool[(pool.first_seen >= t_val) & (pool.first_seen < t_test)]
    te_t = pool[pool.first_seen >= t_test]
    te_t = te_t[(te_t.label == 0) | ~te_t.reg.isin(set(tr_t.reg))]

    melange = pool.sample(frac=1.0, random_state=7)
    n_tr, n_es = len(tr_t), len(es_t)
    tr_a, es_a, te_a = melange.iloc[:n_tr], melange.iloc[n_tr:n_tr + n_es], melange.iloc[n_tr + n_es:]

    res = {}
    for nom, (tr, es, te) in (("aleatoire", (tr_a, es_a, te_a)), ("temporelle", (tr_t, es_t, te_t))):
        log(f"  decoupe {nom} : entrainement {len(tr)}, test {len(te)}...")
        b = entrainer_lgbm(M.construire_X(tr.url.tolist(), vocab), tr.label.values,
                           M.construire_X(es.url.tolist(), vocab), es.label.values)
        r = evaluer(b.predict(M.construire_X(te.url.tolist(), vocab)), te.label.values, {0.9: 0.5})
        r["n_test"] = {"phishing": int((te.label == 1).sum()), "legitime": int((te.label == 0).sum())}
        res[nom] = r
    return res


def section_comparaison(cmp):
    al, tp = cmp["aleatoire"], cmp["temporelle"]
    r_al, r_tp = al.get("rappel_a_0.1pct_fp", 0), tp.get("rappel_a_0.1pct_fp", 0)
    ecart = r_al - r_tp
    lignes = [
        "### Decoupe aleatoire contre decoupe temporelle (meme population)\n",
        "Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. "
        "Seule la maniere de tirer le test change.\n",
        "| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP |",
        "| --- | --- | --- | --- |",
        f"| Aleatoire (ce que fait la plupart des projets) | {entier(al['n_test']['phishing'])} / "
        f"{entier(al['n_test']['legitime'])} | {dec(al['auc'])} | {pct(r_al)} |",
        f"| Temporelle, domaines nouveaux | {entier(tp['n_test']['phishing'])} / "
        f"{entier(tp['n_test']['legitime'])} | {dec(tp['auc'])} | {pct(r_tp)} |",
        "",
    ]
    if ecart > 0.02:
        lignes.append(f"La decoupe aleatoire surestime le rappel de **{dec(100 * ecart, 1)} points** : des URL "
                      "de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele "
                      "est note sur des campagnes qu'il a deja vues.")
    elif ecart < -0.02:
        lignes.append(f"La decoupe temporelle fait mieux de {dec(100 * -ecart, 1)} points. Ce n'est pas une "
                      "fuite : la periode recente est plus facile a separer sur ce corpus. A analyser "
                      "avant de conclure quoi que ce soit.")
    else:
        lignes.append("Pas d'ecart significatif sur ce corpus : la fuite par campagne y est faible. "
                      "C'est un resultat en soi, a publier tel quel.")
    return "\n".join(lignes) + "\n"


# --------------------------------------------------------------------------
# CNN caracteres
# --------------------------------------------------------------------------

def entrainer_cnn(train, val_es, epoques, lot):
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    log(f"  peripherique : {device}" + (f" ({torch.cuda.get_device_name(0)})" if device == "cuda" else
                                       " — installe torch CUDA pour utiliser la RTX"))
    torch.manual_seed(42)
    Xtr = M.encoder(train.url.tolist())
    ytr = train.label.values.astype(np.float32)
    Xes = M.encoder(val_es.url.tolist())
    yes = val_es.label.values

    modele = M.creer_cnn().to(device)
    opt = torch.optim.AdamW(modele.parameters(), lr=2e-3, weight_decay=1e-4)
    pos, neg = ytr.sum(), len(ytr) - ytr.sum()
    perte = torch.nn.BCEWithLogitsLoss(pos_weight=torch.tensor([neg / max(pos, 1)], device=device))
    gpu = device == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=gpu)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=2e-3, total_steps=epoques * math.ceil(len(Xtr) / lot))

    def scorer(X):
        modele.eval()
        s = []
        with torch.no_grad():
            for i in range(0, len(X), 2048):
                xb = torch.from_numpy(X[i:i + 2048]).to(device)
                with torch.autocast(device_type=device, dtype=torch.float16, enabled=gpu):
                    s.append(torch.sigmoid(modele(xb).float()).cpu().numpy())
        return np.concatenate(s)

    meilleur, etat = -1.0, None
    for ep in range(epoques):
        t0 = time.time()
        modele.train()
        perm = RNG.permutation(len(Xtr))
        total = 0.0
        for i in range(0, len(perm), lot):
            idx = perm[i:i + lot]
            xb = torch.from_numpy(Xtr[idx]).to(device, non_blocking=True)
            yb = torch.from_numpy(ytr[idx]).to(device, non_blocking=True)
            with torch.autocast(device_type=device, dtype=torch.float16, enabled=gpu):
                l = perte(modele(xb).float(), yb)
            opt.zero_grad(set_to_none=True)
            scaler.scale(l).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()
            total += l.detach().item() * len(idx)
        auc = roc_auc_score(yes, scorer(Xes)) if len(set(yes)) == 2 else 0.0
        log(f"  epoque {ep + 1}/{epoques} : perte {total / len(Xtr):.4f}, AUC validation {auc:.4f} "
            f"({time.time() - t0:.0f}s)")
        if auc > meilleur:
            meilleur = auc
            etat = {k: v.detach().cpu().clone() for k, v in modele.state_dict().items()}
    modele.load_state_dict(etat)
    return modele, scorer


# --------------------------------------------------------------------------
# Rapport
# --------------------------------------------------------------------------

def pct(x, n=1):
    return f"{100 * x:.{n}f} %".replace(".", ",")


def entier(x):
    return f"{x:,.0f}".replace(",", " ")


def dec(x, n=4):
    return f"{x:.{n}f}".replace(".", ",")


def section_modele(nom, ev, sg, ab):
    s = [f"### {nom}\n", f"AUC ROC sur le test temporel : **{dec(ev['auc'])}**", ""]
    if "rappel_a_0.1pct_fp" in ev:
        s.append(f"Rappel a 0,1 % de faux positifs : **{pct(ev['rappel_a_0.1pct_fp'])}**\n")
    s += ["| Rappel vise (seuil fixe en validation) | Seuil | Rappel obtenu au test | Faux positifs | "
          "Taux FP [IC 95 %] | Precision reelle a 1/1000 | Alertes / jour |",
          "| --- | --- | --- | --- | --- | --- | --- |"]
    for r in ev["seuils"]:
        s.append(f"| {pct(r['cible'], 0)} | {dec(r['seuil'])} | {pct(r['rappel'])} | "
                 f"{r['fp']} / {entier(r['n_legit'])} | {pct(r['tfp'], 2)} "
                 f"[{pct(r['tfp_bas'], 2)} – {pct(r['tfp_haut'], 2)}] | {pct(r['precision_reelle'])} | "
                 f"**{entier(r['alertes_jour'])}** (jusqu'a {entier(r['alertes_jour_haut'])}) |")
    if sg:
        s += ["", "Faux positifs au seuil « 90 % de rappel », par sous-groupe :", ""]
        for k, v in sg.items():
            if v["n"] == 0:
                s.append(f"- {k} : aucun dans le test")
                continue
            s.append(f"- {k} : {v['fp']} / {entier(v['n'])} = {pct(v['tfp'], 2)} "
                     f"[{pct(v['bas'], 2)} – {pct(v['haut'], 2)}]")
    if ab:
        s += ["", f"Ablation (seuil {dec(ab['seuil'])}, * = classe phishing) :", "",
              "| Domaine | https + vrai | http + vrai | https + typo | http + typo |",
              "| --- | --- | --- | --- | --- |"]
        for nom_d, a, b, c, d in ab["lignes"]:
            f_ = lambda v: f"{dec(v)}{'*' if v >= ab['seuil'] else ''}"  # noqa: E731
            s.append(f"| {nom_d} | {f_(a)} | {f_(b)} | {f_(c)} | {f_(d)} |")
        s += ["", f"Reference legitime : {ab['ref_ok']}/6 — bascule par le seul http : "
                  f"{ab['http_bascule']}/{ab['ref_ok']} — typosquat detecte : "
                  f"{ab['typo_bascule']}/{ab['ref_ok']}"]
    return "\n".join(s) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", default=str(RACINE / "data" / "corpus.csv"))
    ap.add_argument("--sans-cnn", action="store_true")
    ap.add_argument("--bert", action="store_true", help="evaluer aussi ealvaradob/bert-finetuned-phishing")
    ap.add_argument("--epoques", type=int, default=6)
    ap.add_argument("--lot", type=int, default=512)
    ap.add_argument("--sans-aleatoire", action="store_true")
    ap.add_argument("--sans-tld", action="store_true",
                    help="neutraliser l'extension du domaine (ablation d'attribut)")
    ap.add_argument("--sortie", default="",
                    help="ecrire dans models_<nom>/ et reports_<nom>/ sans toucher aux dossiers principaux")
    ap.add_argument("--comparaison-seule", action="store_true",
                    help="ne lancer que la comparaison des decoupes (reports/comparaison_decoupes.md)")
    args = ap.parse_args()

    D_MOD = RACINE / (f"models_{args.sortie}" if args.sortie else "models")
    D_REP = RACINE / (f"reports_{args.sortie}" if args.sortie else "reports")
    D_MOD.mkdir(exist_ok=True)
    D_REP.mkdir(exist_ok=True)
    t0 = time.time()

    log("Chargement du corpus...")
    df = charger(args.corpus)
    train, val_es, val_cal, test, info = decouper(df)
    log(f"  coupures : validation des le {info['t_val']}, test des le {info['t_test']}")
    for k in ("train", "val_arret", "val_calib", "test"):
        log(f"  {k:<10} {info[k]['phishing']:>8} phishing  {info[k]['legitime']:>8} legitimes")
    log(f"  {info['phishing_test_retires_domaine_connu']} phishing du test retires "
        "(domaine deja vu a l'entrainement)")

    vocab = {} if args.sans_tld else vocab_tld(train.url.tolist())

    if args.comparaison_seule:
        log("\n[Comparaison des decoupes, meme population]")
        texte = section_comparaison(comparaison_decoupes(df, vocab, info["t_val"], info["t_test"]))
        (D_REP / "comparaison_decoupes.md").write_text(texte, encoding="utf-8")
        log("\n" + texte + f"\nEcrit dans {D_REP.name}/comparaison_decoupes.md "
            f"en {(time.time() - t0) / 60:.1f} min.")
        return
    y_cal, y_te = val_cal.label.values, test.label.values
    resultats, rapport = {"decoupe": info}, []

    # ---- LightGBM
    log("\n[LightGBM] attributs...")
    Xtr = M.construire_X(train.url.tolist(), vocab)
    Xes = M.construire_X(val_es.url.tolist(), vocab)
    Xcal = M.construire_X(val_cal.url.tolist(), vocab)
    Xte = M.construire_X(test.url.tolist(), vocab)
    log(f"  {len(Xtr)} URL d'entrainement, {Xtr.shape[1]} attributs. Entrainement...")
    booster = entrainer_lgbm(Xtr, train.label.values, Xes, val_es.label.values)
    log(f"  {booster.best_iteration or booster.current_iteration()} arbres retenus")
    calib = M.CalibrateurPlatt().fit(booster.predict(Xcal), y_cal)
    p_cal = calib.predict(booster.predict(Xcal))
    seuils = seuils_validation(p_cal, y_cal)
    p_te = calib.predict(booster.predict(Xte))
    ev = evaluer(p_te, y_te, seuils)
    sg = sous_groupes(p_te, test, set(train.reg), seuils[0.9])
    joblib.dump({"booster": booster, "calib": calib, "vocab_tld": vocab, "seuils": seuils,
                 "entraine_le": date.today().isoformat()}, D_MOD / "lgbm.joblib")
    M.ecrire_empreinte(D_MOD / "lgbm.joblib")
    pred_lgbm = M.PredicteurLGBM(D_MOD / "lgbm.joblib")
    ab = ablation(pred_lgbm.proba, seuils[0.9])
    imp = booster.feature_importance("gain")
    top = sorted(zip(M.NOMS_COLONNES, imp), key=lambda x: -x[1])[:10]
    resultats["lgbm"] = {"eval": ev, "sous_groupes": sg, "ablation": ab,
                         "importance": [(n, float(v)) for n, v in top]}
    rapport.append(section_modele("LightGBM sur attributs (le mien)", ev, sg, ab))
    tot = sum(imp) or 1
    rapport.append("Attributs les plus utilises (part du gain) :\n\n" + "\n".join(
        f"{i + 1}. {F.LIBELLES.get(n, 'extension du domaine (TLD)')} — {pct(v / tot)}"
        for i, (n, v) in enumerate(top)) + "\n")
    part_tld = dict(zip(M.NOMS_COLONNES, imp)).get("tld", 0) / tot
    if part_tld > 0.25:
        alerte = (f"> **Attention : l'extension du domaine porte {pct(part_tld)} de la decision.** "
                  "Verifie qu'elle ne reflete pas la facon dont le corpus a ete construit — les "
                  "legitimes ont ete choisis en .fr, les phishing viennent d'un flux mondial. "
                  "Compare avec `python train.py --sans-tld --sortie sans_tld`.\n")
        rapport.append(alerte)
        log("  ! " + alerte.replace("**", "").replace("> ", "").replace("`", "").strip())
    log(f"  AUC test {ev['auc']:.4f} | a 90 % de rappel vise : rappel {pct(ev['seuils'][1]['rappel'])}, "
        f"FP {pct(ev['seuils'][1]['tfp'], 2)}, {entier(ev['seuils'][1]['alertes_jour'])} alertes/jour")

    if not args.sans_aleatoire:
        log("\n[Comparaison des decoupes, meme population]")
        cmp = comparaison_decoupes(df, vocab, info["t_val"], info["t_test"])
        resultats["comparaison_decoupes"] = cmp
        rapport.append(section_comparaison(cmp))
        log(f"  rappel a 0,1 % FP : aleatoire {pct(cmp['aleatoire'].get('rappel_a_0.1pct_fp', 0))}, "
            f"temporelle {pct(cmp['temporelle'].get('rappel_a_0.1pct_fp', 0))}")

    # ---- CNN
    if not args.sans_cnn:
        try:
            import torch  # noqa: F401
            log("\n[CNN caracteres] entrainement...")
            modele, scorer = entrainer_cnn(train, val_es, args.epoques, args.lot)
            s_cal = scorer(M.encoder(val_cal.url.tolist()))
            calib_c = M.CalibrateurPlatt().fit(s_cal, y_cal)
            seuils_c = seuils_validation(calib_c.predict(s_cal), y_cal)
            p_te_c = calib_c.predict(scorer(M.encoder(test.url.tolist())))
            ev_c = evaluer(p_te_c, y_te, seuils_c)
            sg_c = sous_groupes(p_te_c, test, set(train.reg), seuils_c[0.9])
            torch.save(modele.state_dict(), D_MOD / "charcnn.pt")
            joblib.dump({"calib": calib_c, "seuils": seuils_c}, D_MOD / "charcnn_calib.joblib")
            M.ecrire_empreinte(D_MOD / "charcnn.pt")
            M.ecrire_empreinte(D_MOD / "charcnn_calib.joblib")
            ab_c = ablation(lambda u: calib_c.predict(scorer(M.encoder(u))), seuils_c[0.9])
            resultats["cnn"] = {"eval": ev_c, "sous_groupes": sg_c, "ablation": ab_c}
            rapport.append(section_modele("CNN sur caracteres (le mien)", ev_c, sg_c, ab_c))
            log(f"  AUC test {ev_c['auc']:.4f} | a 90 % de rappel vise : rappel "
                f"{pct(ev_c['seuils'][1]['rappel'])}, FP {pct(ev_c['seuils'][1]['tfp'], 2)}")
        except ImportError:
            log("  torch absent : CNN ignore")

    # ---- BERT de reference
    if args.bert:
        try:
            import torch
            from transformers import pipeline
            log("\n[BERT de reference] evaluation sur le meme test (echantillon)...")
            clf = pipeline("text-classification", model="ealvaradob/bert-finetuned-phishing",
                           device=0 if torch.cuda.is_available() else -1, truncation=True)

            def p_bert(urls):
                out = clf(list(urls), batch_size=32)
                return np.array([r["score"] if "phish" in r["label"].lower() else 1 - r["score"]
                                 for r in out])

            ech_t = pd.concat([test[test.label == 1].sample(min(4000, (test.label == 1).sum()), random_state=1),
                               test[test.label == 0].sample(min(4000, (test.label == 0).sum()), random_state=1)])
            ech_c = pd.concat([val_cal[val_cal.label == 1].sample(min(2000, (y_cal == 1).sum()), random_state=1),
                               val_cal[val_cal.label == 0].sample(min(2000, (y_cal == 0).sum()), random_state=1)])
            seuils_b = seuils_validation(p_bert(ech_c.url), ech_c.label.values)
            pb = p_bert(ech_t.url)
            ev_b = evaluer(pb, ech_t.label.values, seuils_b)
            sg_b = sous_groupes(pb, ech_t, set(train.reg), seuils_b[0.9])
            ab_b = ablation(p_bert, seuils_b[0.9])
            resultats["bert"] = {"eval": ev_b, "sous_groupes": sg_b, "ablation": ab_b}
            rapport.append(section_modele("BERT de reference (ealvaradob), meme protocole", ev_b, sg_b, ab_b))
            log(f"  AUC test {ev_b['auc']:.4f}")
        except Exception as e:  # noqa: BLE001
            log(f"  BERT non evalue : {e}")

    # ---- Rapport
    entete = [
        "# Rapport d'entrainement — classifieur de phishing sur URL\n",
        f"Genere le {date.today().isoformat()} en {(time.time() - t0) / 60:.0f} min.\n",
        "## Question\n",
        "A quel taux de faux positifs peut-on detecter 90 % des URL de phishing, "
        "sur des campagnes que le modele n'a jamais vues ?\n",
        "## Protocole\n",
        f"- Entrainement : tout ce qui precede le {info['t_val']} (+ corpus historique non date "
        "et typosquats synthetiques).",
        f"- Validation : du {info['t_val']} au {info['t_test']}, coupee en deux (arret precoce / "
        "calibration et choix des seuils).",
        f"- Test : a partir du {info['t_test']}, phishing sur domaines jamais vus "
        f"({info['phishing_test_retires_domaine_connu']} URL retirees car domaine deja connu), "
        "aucune URL synthetique.",
        f"- Projection : {entier(VOLUME)} URL par jour, 1 phishing pour {entier(1 / PI)}.",
        "- Schema http/https retire de l'entree des deux modeles.",
        "- Les 6 domaines de l'ablation sont absents de tout le corpus ; wikipedia.org et "
        "letsdefend.io ne figurent meme pas dans la liste de marques.\n",
        "| Ensemble | Phishing | Legitimes |", "| --- | --- | --- |",
    ] + [f"| {k} | {entier(info[k]['phishing'])} | {entier(info[k]['legitime'])} |"
         for k in ("train", "val_arret", "val_calib", "test")] + ["", "## Resultats\n"]
    (D_REP / "rapport.md").write_text("\n".join(entete) + "\n" + "\n".join(rapport),
                                                   encoding="utf-8")
    (D_REP / "metriques.json").write_text(
        json.dumps(resultats, indent=2, ensure_ascii=False, default=float), encoding="utf-8")
    log(f"\nTermine en {(time.time() - t0) / 60:.1f} min. Rapport : {D_REP.name}/rapport.md")
    log("Les modeles apparaissent maintenant dans l'interface : python app.py")


if __name__ == "__main__":
    main()
