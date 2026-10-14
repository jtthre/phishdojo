"""
Ablation : isoler ce que le modele a reellement appris.

On fait varier UN facteur a la fois sur six domaines connus :
  - le schema   : https -> http
  - le domaine  : orthographe correcte -> typosquat d'un caractere

Si le modele detecte le phishing, seule la colonne "typo" doit basculer.
Si la colonne "http" bascule aussi, le modele a appris un artefact de collecte.

Usage :
    python ablation.py
    python ablation.py --model un-autre/modele
"""

import argparse
import sys

DEFAULT_MODEL = "ealvaradob/bert-finetuned-phishing"

# (nom court, domaine+chemin reel, meme chose avec UN caractere change)
PAIRES = [
    ("LetsDefend", "app.letsdefend.io/login",
     "app.letzdefend.io/login"),
    ("GitHub", "github.com/login",
     "githib.com/login"),
    ("impots.gouv.fr", "www.impots.gouv.fr/portail/particulier",
     "www.impots-gouv.fr/portail/particulier"),
    ("Google", "accounts.google.com/signin/v2/identifier",
     "accounts.googIe.com/signin/v2/identifier"),
    ("Wikipedia", "fr.wikipedia.org/wiki/Hameconnage",
     "fr.wikipedla.org/wiki/Hameconnage"),
    ("service-public", "www.service-public.fr/particuliers/vosdroits/R1281",
     "www.service-publlc.fr/particuliers/vosdroits/R1281"),
]


def est_phishing(label):
    l = str(label).lower()
    return ("phish" in l) or (l in {"label_1", "1", "bad", "malicious"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    from transformers import pipeline
    print(f"Chargement de {args.model} (une seule fois) ...\n")
    clf = pipeline("text-classification", model=args.model, truncation=True)

    def score(url):
        """Retourne la probabilite de phishing, quelle que soit la convention de labels."""
        r = clf(url)[0]
        return r["score"] if est_phishing(r["label"]) else 1.0 - r["score"]

    lignes = []
    for nom, vrai, typo in PAIRES:
        lignes.append({
            "nom": nom,
            "https_vrai": score("https://" + vrai),
            "http_vrai": score("http://" + vrai),
            "https_typo": score("https://" + typo),
            "http_typo": score("http://" + typo),
        })

    def marque(p):
        return f"{p:.3f}{'*' if p >= 0.5 else ' '}"

    larg = 84
    print("=" * larg)
    print("Probabilite de PHISHING selon le modele.  * = classe phishing (seuil 0,5)")
    print("=" * larg)
    print(f"{'domaine':<16} {'https+vrai':>11} {'http+vrai':>11} {'https+typo':>11} {'http+typo':>11}")
    print("-" * larg)
    for L in lignes:
        print(f"{L['nom']:<16} {marque(L['https_vrai']):>11} {marque(L['http_vrai']):>11} "
              f"{marque(L['https_typo']):>11} {marque(L['http_typo']):>11}")
    print("=" * larg)

    n = len(lignes)
    ref_ok = sum(1 for L in lignes if L["https_vrai"] < 0.5)
    http_bascule = sum(1 for L in lignes if L["https_vrai"] < 0.5 <= L["http_vrai"])
    typo_bascule = sum(1 for L in lignes if L["https_vrai"] < 0.5 <= L["https_typo"])

    print(f"\nReference (https + vrai domaine) classee legitime : {ref_ok}/{n}")
    print(f"Le seul passage en http fait basculer              : {http_bascule}/{ref_ok}"
          "   <- devrait etre 0")
    print(f"Le seul typosquat fait basculer                    : {typo_bascule}/{ref_ok}"
          "   <- devrait etre {}".format(ref_ok))

    # Effet moyen de chaque facteur, en points de probabilite.
    d_http = sum(L["http_vrai"] - L["https_vrai"] for L in lignes) / n
    d_typo = sum(L["https_typo"] - L["https_vrai"] for L in lignes) / n
    print(f"\nEffet moyen du passage en http   : {d_http:+.3f}")
    print(f"Effet moyen du typosquat seul    : {d_typo:+.3f}")

    print("\n" + "-" * larg)
    if http_bascule == 0:
        print("LECTURE : le schema ne pilote pas la decision. Le modele regarde le domaine.")
    elif http_bascule >= ref_ok / 2:
        print("LECTURE : le modele a largement appris 'http = phishing'.")
        print("C'est un artefact de collecte, pas un signal de phishing. En 2026 la")
        print("majorite des sites de phishing sert du HTTPS valide (certificats gratuits),")
        print("pendant que du HTTP legitime subsiste sur les intranets et les equipements.")
        print("Consequence : tout service interne en http genere une alerte.")
    else:
        print("LECTURE : le schema pese, sans dominer. A documenter dans les limitations.")
    print("-" * larg)

    return 0


if __name__ == "__main__":
    sys.exit(main())
