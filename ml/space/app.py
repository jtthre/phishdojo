"""
Auditeur de modeles de detection de phishing sur URL.

Interface Gradio : tester une URL, un lot etiquete, ou lancer une ablation, sur un
modele du Hub OU sur tes propres modeles entraines (dossier models/, cree par train.py).
Local : python app.py -> http://127.0.0.1:7860   |   Se publie tel quel en Space.
"""

import gradio as gr
import numpy as np

import features as F

try:
    import modeles as M
    LOCAUX = M.predicteurs_locaux()
except Exception as e:  # noqa: BLE001  (Space sans modeles locaux, dependances absentes...)
    print(f"Modeles locaux indisponibles : {e}")
    M, LOCAUX = None, {}

MODELES_HUB = [
    "ealvaradob/bert-finetuned-phishing",
    "pelz-y3mi/phishing-detector",
]
MODELES = list(LOCAUX) + MODELES_HUB
PI = 0.001
_cache = {}


def _n(x):
    """Entier a la francaise : 100 000."""
    return f"{x:,.0f}".replace(",", " ")


def est_phishing_label(label):
    l = str(label).lower()
    return ("phish" in l) or (l in {"label_1", "1", "bad", "malicious"})


def probas(nom_modele, urls):
    """Probabilites de phishing pour une liste d'URL, modele local ou du Hub."""
    urls = list(urls)
    if nom_modele in LOCAUX:
        return [float(x) for x in LOCAUX[nom_modele].proba(urls)]
    if nom_modele not in _cache:
        from transformers import pipeline
        _cache[nom_modele] = pipeline("text-classification", model=nom_modele, truncation=True)
    out = _cache[nom_modele](urls, batch_size=16)
    return [r["score"] if est_phishing_label(r["label"]) else 1.0 - r["score"] for r in out]


def info_modele(nom_modele):
    if nom_modele in LOCAUX:
        s = LOCAUX[nom_modele].seuils
        if s:
            return (f"Modele entraine par toi, calibre. Seuils fixes en validation : "
                    f"{float(s.get(0.8, s.get('0.8', 0))):.3f} pour 80 % de rappel, "
                    f"{float(s.get(0.9, s.get('0.9', 0))):.3f} pour 90 %, "
                    f"{float(s.get(0.95, s.get('0.95', 0))):.3f} pour 95 %.")
        return "Modele entraine par toi, calibre."
    return "Modele du Hub, non calibre : ses scores sont souvent colles a 0 ou a 1."


# --------------------------------------------------------------------------
# Onglet 1 : une URL
# --------------------------------------------------------------------------

def tester_une(nom_modele, url, seuil):
    url = (url or "").strip()
    if not url:
        return "Entre une URL.", {}
    p = probas(nom_modele, [url])[0]
    verdict = "PHISHING" if p >= seuil else "LEGITIME"
    marge = abs(p - seuil)
    texte = [f"## {verdict}",
             f"Probabilite de phishing : **{p:.3f}** — seuil {seuil:.2f} — "
             f"decision {'proche du seuil' if marge < 0.15 else 'nette'}.",
             f"`{url}`"]

    if nom_modele in LOCAUX and M is not None:
        reel = float(M.ajuster_prior(p, PI))
        texte.append(
            f"\nSur un trafic reel (1 phishing pour 1000 URL), la meme URL est du phishing "
            f"avec une probabilite d'environ **{reel:.1%}**. C'est l'a priori qui change tout : "
            "meme un bon score laisse beaucoup de fausses alertes quand le phishing est rare.")
        pred = LOCAUX[nom_modele]
        if hasattr(pred, "expliquer"):
            tableau = ["### Pourquoi", "", "| Ce qui compte | Valeur | Effet |", "| --- | --- | --- |"]
            for libelle, valeur, contrib, sens in pred.expliquer(url):
                tableau.append(f"| {libelle} | {valeur} | {sens} ({contrib:+.2f}) |")
            tableau += ["", "*Contributions SHAP en log-cote, calculees par LightGBM.*"]
            texte.append("\n".join(tableau))
    return "\n\n".join(texte), {"phishing": p, "legitime": 1.0 - p}


# --------------------------------------------------------------------------
# Onglet 2 : lot etiquete -> metriques d'exploitation
# --------------------------------------------------------------------------

EXEMPLE_LOT = """- https://www.impots.gouv.fr/portail/particulier
- https://github.com/login
- https://accounts.google.com/signin/v2/identifier
- https://fr.wikipedia.org/wiki/Hameconnage
- https://app.letsdefend.io/login
+ http://secure-paypal-verify.account-update.top/login/session?id=8f2a
+ https://boulangerie-exemple-quartier.fr/wp-content/uploads/2026/01/session/verification.php
+ http://192.168.44.12/owa/auth/logon.aspx?replaceCurrent=1
+ https://accounts.googIe.com/signin/v2/identifier
+ https://app.letzdefend.io/login"""


# Space public : lots plafonnes, et seuls les modeles de la liste peuvent etre charges
MAX_LIGNES = 500


def analyser_lot(nom_modele, texte, seuil, volume, taux_base):
    entrees = []
    for ligne in (texte or "").splitlines()[:MAX_LIGNES]:
        ligne = ligne.strip()
        if not ligne:
            continue
        if ligne[0] in "+-":
            entrees.append(("phishing" if ligne[0] == "+" else "legitime", ligne[1:].strip()))
        else:
            entrees.append(("", ligne))
    entrees = [(v, u) for v, u in entrees if u]
    if not entrees:
        return [], "Entre au moins une URL."

    ps = probas(nom_modele, [u for _, u in entrees])
    rows, vp, fp, vn, fn = [], 0, 0, 0, 0
    for (verite, url), p in zip(entrees, ps):
        predit = "phishing" if p >= seuil else "legitime"
        statut = ""
        if verite:
            if verite == "phishing" and predit == "phishing":
                vp += 1; statut = "vrai positif"
            elif verite == "phishing":
                fn += 1; statut = "FAUX NEGATIF"
            elif predit == "phishing":
                fp += 1; statut = "FAUX POSITIF"
            else:
                vn += 1; statut = "vrai negatif"
        rows.append([url, verite or "?", predit, round(p, 3), statut])
    rows.sort(key=lambda r: -r[3])

    if vp + fn + fp + vn == 0:
        return rows, ("Aucune etiquette fournie — prefixe tes URL par `+` (phishing) "
                      "ou `-` (legitime) pour obtenir les metriques.")

    rappel = vp / (vp + fn) if (vp + fn) else 0.0
    precision = vp / (vp + fp) if (vp + fp) else 0.0
    tfp = fp / (fp + vn) if (fp + vn) else 0.0
    phish_reel = volume * taux_base
    legit_reel = volume - phish_reel
    alertes = phish_reel * rappel + legit_reel * tfp

    rapport = f"""### Au seuil {seuil:.2f}

| Metrique | Valeur |
| --- | --- |
| Rappel (phishing detecte) | {rappel:.1%} |
| Precision sur ce lot | {precision:.1%} |
| Taux de faux positifs | {tfp:.2%} |
| Vrais positifs / faux negatifs | {vp} / {fn} |
| Faux positifs / vrais negatifs | {fp} / {vn} |

### Projection sur {_n(volume)} URL par jour, 1 phishing pour {_n(1 / taux_base)}

**{_n(alertes)} alertes par jour**, soit **{alertes / 200:.1f} analyste(s)** a temps plein
(base : 200 alertes traitees par analyste et par jour).
Dont {_n(phish_reel * rappel)} vraies et {_n(legit_reel * tfp)} fausses.
"""
    n_leg = fp + vn
    if n_leg and n_leg < 1000:
        rapport += (f"\n> Avec {n_leg} URL legitimes, une seule fausse alerte de plus ou de moins "
                    f"deplace le taux de {1 / n_leg:.2%}. Pour une projection fiable, il faut "
                    "des milliers de legitimes : c'est le role du rapport de train.py.")
    if tfp > 0.01:
        rapport += ("\n\n> Au-dessus de 1 % de faux positifs, la file devient ingerable : "
                    "les analystes cessent de lire les alertes.")
    return rows, rapport


# --------------------------------------------------------------------------
# Onglet 3 : ablation
# --------------------------------------------------------------------------

def ablation(nom_modele, seuil, paires):
    urls = []
    for _, vrai, typo in paires:
        urls += ["https://" + vrai, "http://" + vrai, "https://" + typo, "http://" + typo]
    ps = probas(nom_modele, urls)
    rows, ref_ok, http_b, typo_b, d_http, d_typo = [], 0, 0, 0, 0.0, 0.0
    for i, (nom, _, _) in enumerate(paires):
        a, b, c, d = ps[4 * i: 4 * i + 4]
        rows.append([nom, round(a, 3), round(b, 3), round(c, 3), round(d, 3)])
        d_http += b - a
        d_typo += c - a
        if a < seuil:
            ref_ok += 1
            http_b += b >= seuil
            typo_b += c >= seuil
    n = len(paires)
    rapport = f"""### Lecture, au seuil {seuil:.2f}

| Observation | Resultat | Attendu |
| --- | --- | --- |
| Reference (https + vrai domaine) classee legitime | {ref_ok}/{n} | {n}/{n} |
| Le seul passage en http fait basculer | {http_b}/{ref_ok} | 0 |
| Le seul typosquat fait basculer | {typo_b}/{ref_ok} | {ref_ok} |

Effet moyen du passage en http : **{d_http / n:+.3f}** — effet moyen du typosquat : **{d_typo / n:+.3f}**

Un seul facteur change a la fois, donc chaque effet est attribuable.
Les modeles entraines avec train.py n'ont vu AUCUN de ces six domaines : c'est un test de
generalisation. wikipedia.org et letsdefend.io ne sont meme pas dans leur liste de marques.
"""
    return rows, rapport


def ablation_audit(nom_modele, seuil):
    return ablation(nom_modele, seuil, F.PAIRES_ABLATION)


def ablation_perso(nom_modele, seuil, vrai, typo):
    vrai = F.retirer_schema(vrai or "")
    typo = F.retirer_schema(typo or "")
    if not vrai or not typo:
        return [], "Renseigne le domaine reel et sa version typosquattee."
    return ablation(nom_modele, seuil, [("ton cas", vrai, typo)])


# --------------------------------------------------------------------------
# Onglet 4 : duel
# --------------------------------------------------------------------------

def duel(modele_a, modele_b, texte):
    urls = [l.strip().lstrip("+-").strip() for l in (texte or "").splitlines() if l.strip()][:MAX_LIGNES]
    if not urls:
        return []
    pa, pb = probas(modele_a, urls), probas(modele_b, urls)
    rows = [[u, round(a, 3), round(b, 3), round(a - b, 3)] for u, a, b in zip(urls, pa, pb)]
    rows.sort(key=lambda r: -abs(r[3]))
    return rows


# --------------------------------------------------------------------------
# Interface
# --------------------------------------------------------------------------

# Gradio 6 a deplace le theme de Blocks() vers launch() : compatible avec les deux.
_THEME = gr.themes.Soft()
_GRADIO6 = int(gr.__version__.split(".")[0]) >= 6

with gr.Blocks(title="Auditeur de modeles phishing", **({} if _GRADIO6 else {"theme": _THEME})) as demo:
    gr.Markdown(
        "# Auditeur de modeles de detection de phishing\n"
        "Tester un modele sur des URL, mesurer ce que ça donnerait en production, "
        "et isoler ce qu'il a reellement appris."
        + ("" if LOCAUX else "\n\n*Aucun modele local : lance `python train.py` pour entrainer les tiens.*")
    )

    modele = gr.Dropdown(MODELES, value=MODELES[0], label="Modele", allow_custom_value=False,
                         info="Tes modeles entraines en tete, puis ceux du Hub. "
                              "N'importe quel identifiant du Hub est accepte.")
    note = gr.Markdown(info_modele(MODELES[0]))
    modele.change(info_modele, modele, note)
    seuil = gr.Slider(0.05, 0.99, value=0.5, step=0.01, label="Seuil de decision",
                      info="Au-dessus : classe phishing. Le reglage qui arbitre detection contre fausses alertes.")

    with gr.Tab("Une URL"):
        url_in = gr.Textbox(label="URL", placeholder="https://exemple.fr/login")
        btn1 = gr.Button("Analyser", variant="primary")
        verdict_md = gr.Markdown()
        barres = gr.Label(label="Probabilites", num_top_classes=2)
        btn1.click(tester_une, [modele, url_in, seuil], [verdict_md, barres])
        url_in.submit(tester_une, [modele, url_in, seuil], [verdict_md, barres])

    with gr.Tab("Lot etiquete"):
        gr.Markdown("Une URL par ligne. Prefixe `+` pour phishing, `-` pour legitime — "
                    "les etiquettes donnent les metriques et la projection en alertes par jour.")
        lot_in = gr.Textbox(value=EXEMPLE_LOT, lines=12, label="URL etiquetees")
        with gr.Row():
            volume = gr.Number(value=100000, label="URL vues par jour")
            taux = gr.Dropdown([0.001, 0.0005, 0.0001], value=0.001, label="Taux de base du phishing",
                               info="0,001 = 1 phishing pour 1000 URL")
        btn2 = gr.Button("Analyser le lot", variant="primary")
        table_lot = gr.Dataframe(headers=["URL", "verite", "predit", "proba", "statut"],
                                 wrap=True, label="Resultats, les plus suspects en tete")
        rapport_lot = gr.Markdown()
        btn2.click(analyser_lot, [modele, lot_in, seuil, volume, taux], [table_lot, rapport_lot])

    with gr.Tab("Ablation"):
        gr.Markdown("On fait varier **un seul facteur a la fois** — le schema, puis l'orthographe "
                    "du domaine — pour savoir lequel pilote vraiment la decision.")
        btn3 = gr.Button("Lancer l'audit de reference (6 domaines, 24 predictions)", variant="primary")
        table_abl = gr.Dataframe(
            headers=["domaine", "https + vrai", "http + vrai", "https + typo", "http + typo"],
            label="Probabilite de phishing")
        rapport_abl = gr.Markdown()
        btn3.click(ablation_audit, [modele, seuil], [table_abl, rapport_abl])
        gr.Markdown("### Ou teste ton propre couple")
        with gr.Row():
            vrai_in = gr.Textbox(label="Domaine + chemin reels", placeholder="app.letsdefend.io/login")
            typo_in = gr.Textbox(label="Version typosquattee", placeholder="app.letzdefend.io/login")
        btn4 = gr.Button("Comparer")
        btn4.click(ablation_perso, [modele, seuil, vrai_in, typo_in], [table_abl, rapport_abl])

    with gr.Tab("Duel"):
        gr.Markdown("Deux modeles sur les memes URL, tries par desaccord. "
                    "Les desaccords sont les URL a analyser a la main.")
        with gr.Row():
            mod_a = gr.Dropdown(MODELES, value=MODELES[0], label="Modele A", allow_custom_value=False)
            mod_b = gr.Dropdown(MODELES, value=MODELES[min(1, len(MODELES) - 1)], label="Modele B",
                                allow_custom_value=False)
        duel_in = gr.Textbox(value=EXEMPLE_LOT, lines=10, label="URL (les prefixes + et - sont ignores)")
        btn5 = gr.Button("Comparer", variant="primary")
        table_duel = gr.Dataframe(headers=["URL", "proba A", "proba B", "ecart A - B"], wrap=True)
        btn5.click(duel, [mod_a, mod_b, duel_in], table_duel)

    gr.Markdown("---\nAucune URL n'est visitee : seule la chaine de caracteres est analysee. "
                "Un score n'est pas une preuve — il sert a prioriser une file d'analyse, jamais a bloquer.")

if __name__ == "__main__":
    demo.launch(**({"theme": _THEME} if _GRADIO6 else {}))
