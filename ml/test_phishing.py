"""
Test local d'un modele de detection de phishing telecharge depuis Hugging Face.

Usage :
    python test_phishing.py
    python test_phishing.py --model ealvaradob/bert-finetuned-phishing
    python test_phishing.py --url "http://exemple-suspect.top/login"

Le modele est telecharge au premier lancement (~1.3 Go pour bert-large)
puis mis en cache dans %USERPROFILE%\\.cache\\huggingface.
"""

import argparse
import sys

DEFAULT_MODEL = "ealvaradob/bert-finetuned-phishing"

# Jeu de test : la verite terrain est ce que NOUS savons, pas ce que le modele dit.
# C'est le point de tout l'exercice : comparer les deux.
CAS_DE_TEST = [
    # (url, verite_terrain, commentaire)
    ("http://secure-paypal-verify.account-update.top/login/session?id=8f2a",
     "phishing", "typosquatting evident, TLD .top, mot de marque hors domaine"),

    ("https://boulangerie-exemple-quartier.fr/wp-content/uploads/2026/01/session/verification.php",
     "phishing", "site WordPress legitime compromis, chemin revelateur"),

    ("http://192.168.44.12/owa/auth/logon.aspx?replaceCurrent=1",
     "phishing", "IP litterale a la place du domaine"),

    ("https://www.impots.gouv.fr/portail/particulier/questions/comment-declarer-mes-revenus-en-ligne",
     "legitime", "administration francaise, URL longue mais saine"),

    ("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=4765445b&response_type=code&redirect_uri=https%3A%2F%2Fwww.office.com",
     "legitime", "VRAI flux OAuth Microsoft - le faux positif classique"),

    ("https://accounts.google.com/o/oauth2/v2/auth?client_id=407408718192&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=email",
     "legitime", "VRAI flux OAuth Google - meme piege"),

    ("https://github.com/anthropics/claude-code/blob/main/README.md",
     "legitime", "URL de reference, doit passer sans discussion"),

    # chaine notee par le modele, jamais visitee : seul le domaine du raccourcisseur compte ici
    ("https://bit.ly/exemple-phishdojo",
     "legitime", "raccourcisseur : le modele ne peut rien savoir, que fait-il ?"),
]


def charger(nom_modele):
    from transformers import pipeline
    print(f"Chargement de {nom_modele} ...")
    print("(premier lancement : telechargement des poids, patiente)\n")
    return pipeline("text-classification", model=nom_modele, truncation=True)


def est_phishing(label):
    """Normalise le label du modele : les conventions varient d'un modele a l'autre."""
    l = str(label).lower()
    return ("phish" in l) or (l in {"label_1", "1", "bad", "malicious"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--url", help="tester une seule URL au lieu du jeu de test")
    args = ap.parse_args()

    try:
        clf = charger(args.model)
    except Exception as e:
        print(f"Echec du chargement : {e}", file=sys.stderr)
        print("\nVerifie que torch et transformers sont installes "
              "(pip install -r requirements.txt).", file=sys.stderr)
        return 1

    if args.url:
        r = clf(args.url)[0]
        verdict = "PHISHING" if est_phishing(r["label"]) else "LEGITIME"
        print(f"{verdict}  (score {r['score']:.3f}, label brut '{r['label']}')")
        print(f"URL : {args.url}")
        return 0

    largeur = 78
    print("=" * largeur)
    print(f"{'VERITE':<10} {'MODELE':<10} {'SCORE':>7}  {'OK':<4} URL")
    print("=" * largeur)

    justes = 0
    faux_positifs = []
    faux_negatifs = []

    for url, verite, commentaire in CAS_DE_TEST:
        r = clf(url)[0]
        predit = "phishing" if est_phishing(r["label"]) else "legitime"
        ok = predit == verite
        justes += ok

        if not ok and verite == "legitime":
            faux_positifs.append((url, commentaire, r["score"]))
        if not ok and verite == "phishing":
            faux_negatifs.append((url, commentaire, r["score"]))

        affiche = url if len(url) <= 46 else url[:43] + "..."
        print(f"{verite:<10} {predit:<10} {r['score']:>7.3f}  {'OK' if ok else '>>':<4} {affiche}")

    print("=" * largeur)
    print(f"\n{justes}/{len(CAS_DE_TEST)} corrects sur ce mini jeu de test.")
    print("Ce chiffre ne veut rien dire tout seul : 8 URL choisies a la main,")
    print("moitie phishing moitie legitime. Le vrai taux est de 1 phishing pour 1000.\n")

    if faux_positifs:
        print("FAUX POSITIFS -- des URL saines bloquees :")
        for url, com, s in faux_positifs:
            print(f"  - {url}")
            print(f"    {com}  (score {s:.3f})")
        print()

    if faux_negatifs:
        print("FAUX NEGATIFS -- du phishing qui passe :")
        for url, com, s in faux_negatifs:
            print(f"  - {url}")
            print(f"    {com}  (score {s:.3f})")
        print()

    if faux_positifs:
        n = len(faux_positifs)
        d = sum(1 for _, v, _ in CAS_DE_TEST if v == "legitime")
        taux = n / d
        print("-" * largeur)
        print("CE QUE CA DONNE EN PRODUCTION")
        print("-" * largeur)
        print(f"Taux de faux positifs observe ici : {n}/{d} = {taux:.1%}")
        print(f"Sur 100 000 URL vues par jour, dont ~100 de vrai phishing :")
        print(f"  -> environ {int(99900 * taux):,} fausses alertes par jour.".replace(",", " "))
        print("  -> un analyste traite ~200 alertes par jour.")
        print("\nC'est pour cela qu'on ne bloque jamais automatiquement sur un score,")
        print("et qu'on publie le nombre d'alertes par jour, pas l'exactitude.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
