"""
Attributs « honnetes » d'une URL : tout ce qui est lisible dans la chaine seule,
au moment ou elle arrive dans une boite mail. Aucun appel reseau, aucune liste noire,
aucun etat du site apres coup (voir phase 2 de la feuille de route).

Utilise par collect.py (typosquats), train.py et app.py.
"""

import ipaddress
import math
import re
from collections import Counter
from urllib.parse import urlsplit, unquote, parse_qsl

import tldextract
from rapidfuzz import process
from rapidfuzz.distance import Levenshtein

# Liste publique des suffixes embarquee dans le paquet : pas de telechargement,
# resultat identique sur toutes les machines. Les suffixes « prives » (pages.dev,
# blogspot.com, github.io...) sont actives : sur ces hebergeurs, chaque client
# est son propre domaine.
_EXTRACT = tldextract.TLDExtract(suffix_list_urls=(), include_psl_private_domains=True)

# --------------------------------------------------------------------------
# Marques surveillees. Sert a deux choses :
#   1. detecter l'imitation (attribut « squelette identique a une marque ») ;
#   2. generer des typosquats d'entrainement (collect.py).
# --------------------------------------------------------------------------

MARQUES_FR = [
    "impots.gouv.fr", "service-public.fr", "ameli.fr", "caf.fr", "franceconnect.gouv.fr",
    "ants.gouv.fr", "antai.gouv.fr", "moncompteformation.gouv.fr", "francetravail.fr",
    "urssaf.fr", "laposte.fr", "labanquepostale.fr", "colissimo.fr", "chronopost.fr",
    "mondialrelay.fr", "credit-agricole.fr", "societegenerale.fr", "mabanque.bnpparibas",
    "lcl.fr", "caisse-epargne.fr", "banquepopulaire.fr", "creditmutuel.fr", "boursorama.com",
    "orange.fr", "sfr.fr", "free.fr", "bouyguestelecom.fr", "edf.fr", "engie.fr",
    "sncf-connect.com", "leboncoin.fr", "vinted.fr", "doctolib.fr", "amazon.fr",
]
MARQUES_INTL = [
    "google.com", "microsoft.com", "microsoftonline.com", "live.com", "office.com",
    "outlook.com", "apple.com", "icloud.com", "paypal.com", "amazon.com", "netflix.com",
    "facebook.com", "instagram.com", "whatsapp.com", "linkedin.com", "github.com",
    "dropbox.com", "docusign.net", "adobe.com", "dhl.com", "fedex.com", "ups.com",
    "steamcommunity.com", "roblox.com", "binance.com", "coinbase.com", "metamask.io",
    "ledger.com", "trezor.io", "spotify.com", "yahoo.com", "x.com",
]
# Pack Senegal (octobre 2026). Chaque domaine a ete verifie (page servie, Tranco, presse) :
# voir reports/mesure_sn.md. Sans eux, orange.sn ou laposte.sn passaient pour des imitations
# d'orange.fr ou de laposte.fr. Ecartes faute de preuve : Mixx by Yas (sert sous yas.sn),
# Wizall, CBAO, SGBS. Senelec et SEN'EAU restent hors liste : ils servent a l'ablation.
MARQUES_SN = [
    "wave.com", "orange.sn", "sonatel.sn", "orange-sonatel.com", "yas.sn", "expresso.sn",
    "dgid.sn", "laposte.sn", "jumia.sn", "ecobank.com",
]
MARQUES = MARQUES_FR + MARQUES_INTL + MARQUES_SN

# Les domaines de l'audit d'ablation. Ils sont TENUS A L'ECART de tout le corpus
# d'entrainement (collect.py et ajout_sn.py les filtrent) : l'ablation mesure donc une
# generalisation, pas une memorisation. wikipedia.org, letsdefend.io, senelec.sn et
# seneau.sn ne sont meme pas dans la liste de marques : ils mesurent ce que le modele a
# appris sans aucun dictionnaire.
DOMAINES_ABLATION = {
    "letsdefend.io", "github.com", "impots.gouv.fr", "google.com",
    "wikipedia.org", "service-public.fr", "senelec.sn", "seneau.sn",
}
PAIRES_ABLATION = [
    ("LetsDefend", "app.letsdefend.io/login", "app.letzdefend.io/login"),
    ("GitHub", "github.com/login", "githib.com/login"),
    ("impots.gouv.fr", "www.impots.gouv.fr/portail/particulier", "www.impots-gouv.fr/portail/particulier"),
    ("Google", "accounts.google.com/signin/v2/identifier", "accounts.googIe.com/signin/v2/identifier"),
    ("Wikipedia", "fr.wikipedia.org/wiki/Hameconnage", "fr.wikipedla.org/wiki/Hameconnage"),
    ("service-public", "www.service-public.fr/particuliers/vosdroits/R1281",
     "www.service-publlc.fr/particuliers/vosdroits/R1281"),
    ("Senelec", "www.senelec.sn/paiement-facture", "www.seneIec.sn/paiement-facture"),
    ("SEN'EAU", "www.seneau.sn/espace-client", "www.sen-eau.sn/espace-client"),
]

RACCOURCISSEURS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly",
    "rebrand.ly", "t.ly", "shorturl.at", "rb.gy", "g5.lu", "tiny.cc", "s.id", "qrco.de",
}

MOTS_SUSPECTS = [
    # anglais
    "login", "signin", "sign-in", "verify", "verification", "secure", "account", "update",
    "confirm", "password", "wallet", "auth", "session", "webscr", "billing", "recover",
    "unlock", "suspend", "limited", "support", "invoice", "payment", "bank",
    # francais
    "connexion", "compte", "securite", "paiement", "facture", "colis", "remboursement",
    "identifiant", "motdepasse", "mot-de-passe", "validation", "livraison", "amende",
]
_RE_MOTS = re.compile("|".join(re.escape(m) for m in MOTS_SUSPECTS))

# Caracteres trompeurs -> leur sosie latin. Applique AVANT la mise en minuscules :
# le « I » majuscule de googIe.com doit devenir un « l ».
CONFUSABLES = {
    "I": "l", "1": "l", "|": "l", "0": "o", "@": "a", "$": "s", "5": "s",
    # cyrillique
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i",
    "ј": "j", "ѕ": "s", "ԁ": "d", "ӏ": "l", "һ": "h", "ԛ": "q", "ԝ": "w", "ɡ": "g",
    # grec
    "ο": "o", "α": "a", "ν": "v", "ι": "i", "κ": "k", "ρ": "p", "τ": "t",
}
_MULTI = (("rn", "m"), ("vv", "w"))


def squelette(texte):
    """Forme visuelle canonique : sosies remplaces, minuscules, separateurs retires."""
    t = "".join(CONFUSABLES.get(c, c) for c in texte).lower()
    for a, b in _MULTI:
        t = t.replace(a, b)
    return re.sub(r"[.\-_]", "", t)


_SQ_MARQUES = {m: squelette(m) for m in MARQUES}
_SQ_LISTE = list(_SQ_MARQUES.values())
_SQ_VERS_MARQUE = {v: k for k, v in _SQ_MARQUES.items()}
# Noms courts ("paypal", "impots") pour reperer une marque citee hors de son domaine.
# Seuls les noms de 5 lettres ou plus : "sfr" ou "lcl" apparaissent partout par hasard.
_NOMS_MARQUES = {}  # nom -> ensemble des vrais domaines (amazon -> amazon.fr, amazon.com)
for _m in MARQUES:
    _nom = _m.split(".")[0] if not _m.startswith("mabanque.") else "bnpparibas"
    if len(_nom.replace("-", "")) >= 5:
        _NOMS_MARQUES.setdefault(_nom, set()).add(_m)


# --------------------------------------------------------------------------
# Decoupage
# --------------------------------------------------------------------------

def retirer_schema(url):
    return re.sub(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", "", url.strip())


def decouper(url):
    """Renvoie (hote_brut, hote_affiche, chemin, requete, domaine_enregistre,
    sous_domaine, suffixe, hebergeur_prive, port_explicite)."""
    brut = url.strip()
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://", brut):
        brut = "http://" + brut
    try:
        parts = urlsplit(brut)
        netloc, chemin, requete = parts.netloc, parts.path, parts.query
    except ValueError:  # URL malformee (crochets IPv6 casses...) : decoupage manuel
        reste = brut.split("://", 1)[-1]
        netloc, _, apres = reste.partition("/")
        chemin, _, requete = ("/" + apres).partition("?")
    hote = netloc.rsplit("@", 1)[-1]
    if hote.startswith("["):
        hote, _, port = hote.partition("]")
        hote += "]"
        port = port.lstrip(":")
    else:
        hote, _, port = hote.partition(":")
    port_explicite = 1 if port.isdigit() else 0

    hote_min = hote.lower()
    if hote_min.startswith("xn--") or ".xn--" in hote_min:
        try:
            hote_affiche = hote_min.encode("ascii").decode("idna")
        except (UnicodeError, ValueError):
            hote_affiche = hote_min
    else:
        hote_affiche = hote
    ext = _EXTRACT(hote_min)
    if ext.domain and ext.suffix:
        enregistre = f"{ext.domain}.{ext.suffix}"
    else:
        enregistre = ext.domain or hote_min
    prive = bool(getattr(ext, "is_private", False))
    return hote, hote_affiche, chemin, requete, enregistre, ext.subdomain, ext.suffix, prive, port_explicite


def domaine_enregistre(url):
    return decouper(url)[4]


def _entropie(s):
    if not s:
        return 0.0
    n = len(s)
    return -sum(c / n * math.log2(c / n) for c in Counter(s).values())


def _est_ip(hote):
    h = hote.strip("[]").lower()
    try:
        ipaddress.ip_address(h)
        return 1
    except ValueError:
        # Formes obscurcies acceptees par les navigateurs : 0xC0A80001, 3232235521
        return 1 if re.fullmatch(r"0x[0-9a-f]{8}|\d{8,10}", h) else 0


# --------------------------------------------------------------------------
# Attributs
# --------------------------------------------------------------------------

NOMS_ATTRIBUTS = [
    "long_url", "long_hote", "long_chemin", "nb_sous_domaines", "profondeur_chemin",
    "nb_parametres", "ip_litterale", "port_explicite", "nb_tirets_hote", "nb_chiffres_hote",
    "ratio_chiffres", "entropie_domaine", "entropie_url", "arobase", "double_barre_chemin",
    "nb_pourcent", "mots_suspects_hote", "mots_suspects_chemin", "extension_php",
    "hebergeur_gratuit", "raccourcisseur", "hote_majuscule", "punycode", "non_ascii",
    "squelette_marque", "distance_marque", "distance_marque_rel", "marque_hors_domaine",
    "domaine_dans_sous_domaine", "long_label_max",
]

# Libelles lisibles par un analyste (phase 5).
LIBELLES = {
    "long_url": "longueur de l'URL",
    "long_hote": "longueur du nom d'hote",
    "long_chemin": "longueur du chemin",
    "nb_sous_domaines": "nombre de sous-domaines",
    "profondeur_chemin": "profondeur du chemin",
    "nb_parametres": "nombre de parametres",
    "ip_litterale": "adresse IP a la place d'un domaine",
    "port_explicite": "port explicite",
    "nb_tirets_hote": "tirets dans le nom d'hote",
    "nb_chiffres_hote": "chiffres dans le nom d'hote",
    "ratio_chiffres": "proportion de chiffres",
    "entropie_domaine": "domaine d'apparence aleatoire",
    "entropie_url": "URL d'apparence aleatoire",
    "arobase": "arobase dans l'URL",
    "double_barre_chemin": "« // » dans le chemin",
    "nb_pourcent": "encodage %",
    "mots_suspects_hote": "mots d'appat dans le nom d'hote",
    "mots_suspects_chemin": "mots d'appat dans le chemin",
    "extension_php": "page .php",
    "hebergeur_gratuit": "hebergeur gratuit (pages.dev, blogspot...)",
    "raccourcisseur": "raccourcisseur d'URL",
    "hote_majuscule": "majuscule dans le nom d'hote",
    "punycode": "nom de domaine en punycode",
    "non_ascii": "caracteres non latins dans le domaine",
    "squelette_marque": "domaine visuellement identique a une marque",
    "distance_marque": "domaine a quelques lettres d'une marque",
    "distance_marque_rel": "domaine a quelques lettres d'une marque",
    "marque_hors_domaine": "nom de marque hors de son vrai domaine",
    "domaine_dans_sous_domaine": "faux domaine place en sous-domaine",
    "long_label_max": "segment de domaine tres long",
}


def attributs(url):
    """Dictionnaire d'attributs numeriques. Le schema (http/https) est volontairement
    ignore : dans les corpus publics, sa distribution reflete la collecte, pas l'attaque."""
    sans_schema = retirer_schema(url)
    hote, hote_aff, chemin, requete, enreg, sous, suffixe, prive, port = decouper(url)
    hote_min = hote.lower()
    chemin_req = (chemin + "?" + requete) if requete else chemin
    chemin_min = unquote(chemin_req).lower()
    labels = [l for l in hote_min.split(".") if l]
    nom_domaine = enreg.split(".")[0] if enreg else ""

    # Imitation de marque : comparaison des squelettes, en excluant la vraie marque.
    sq_enreg = squelette(_enreg_affiche(hote_aff, enreg))
    vraie_marque = enreg in _SQ_MARQUES
    squelette_marque, dist, dist_rel = 0, 6, 1.0
    if not vraie_marque and sq_enreg:
        if sq_enreg in _SQ_VERS_MARQUE:
            squelette_marque, dist, dist_rel = 1, 0, 0.0
        else:
            meilleur = process.extractOne(sq_enreg, _SQ_LISTE, scorer=Levenshtein.distance)
            if meilleur is not None:
                dist = min(int(meilleur[1]), 6)
                dist_rel = min(dist / max(len(meilleur[0]), 1), 1.0)

    marque_hors = 0
    lieux = (sous or "") + " " + chemin_min + " " + nom_domaine
    for nom, vrais in _NOMS_MARQUES.items():
        if nom in lieux and enreg not in vrais:
            marque_hors = 1
            break

    dans_sous = 1 if sous and re.search(r"\.(com|fr|net|org|gouv|co)(\.|$)", sous.lower()) else 0

    chiffres = sum(c.isdigit() for c in sans_schema)
    return {
        "long_url": len(sans_schema),
        "long_hote": len(hote),
        "long_chemin": len(chemin_req),
        "nb_sous_domaines": len(sous.split(".")) if sous else 0,
        "profondeur_chemin": len([p for p in chemin.split("/") if p]),
        "nb_parametres": len(parse_qsl(requete, keep_blank_values=True)),
        "ip_litterale": _est_ip(hote),
        "port_explicite": port,
        "nb_tirets_hote": hote.count("-"),
        "nb_chiffres_hote": sum(c.isdigit() for c in hote),
        "ratio_chiffres": chiffres / max(len(sans_schema), 1),
        "entropie_domaine": _entropie(nom_domaine),
        "entropie_url": _entropie(sans_schema),
        "arobase": 1 if "@" in sans_schema else 0,
        "double_barre_chemin": 1 if "//" in chemin else 0,
        "nb_pourcent": sans_schema.count("%"),
        "mots_suspects_hote": len(_RE_MOTS.findall(hote_min)),
        "mots_suspects_chemin": len(_RE_MOTS.findall(chemin_min)),
        "extension_php": 1 if re.search(r"\.php\b", chemin_min) else 0,
        "hebergeur_gratuit": 1 if prive else 0,
        "raccourcisseur": 1 if enreg in RACCOURCISSEURS else 0,
        "hote_majuscule": 1 if any(c.isupper() for c in hote) else 0,
        "punycode": 1 if "xn--" in hote_min else 0,
        "non_ascii": 1 if any(ord(c) > 127 for c in hote_aff) else 0,
        "squelette_marque": squelette_marque,
        "distance_marque": dist,
        "distance_marque_rel": dist_rel,
        "marque_hors_domaine": marque_hors,
        "domaine_dans_sous_domaine": dans_sous,
        "long_label_max": max((len(l) for l in labels), default=0),
    }


def _enreg_affiche(hote_aff, enreg):
    """Domaine enregistre dans sa forme affichee (casse et unicode d'origine conserves),
    pour que le squelette voie le « I » de googIe.com ou le « а » cyrillique."""
    labels_aff = hote_aff.split(".")
    n = enreg.count(".") + 1
    return ".".join(labels_aff[-n:]) if len(labels_aff) >= n else enreg


def matrice(urls):
    """Liste d'URL -> liste de listes, dans l'ordre de NOMS_ATTRIBUTS."""
    out = []
    for u in urls:
        a = attributs(u)
        out.append([a[n] for n in NOMS_ATTRIBUTS])
    return out
