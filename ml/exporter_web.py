"""
Exporte le modele LightGBM pour le verificateur du site (phase B).

Deux fichiers, regeneres ensemble :
  - web/modele/url-lgbm.js : les donnees du modele, SANS CODE. Le fichier n'est qu'une
    affectation « window.PDS_MODELE_URL = <JSON>; » (tests/parite.test.js le verifie) :
    arbres, calibration, seuils, vocabulaire des TLD, listes de features.py, liste publique
    des suffixes de tldextract, et les tables Unicode du Python d'entrainement ;
  - tests/parite/reference.json : un jeu de reference (URL synthetiques et cas limites)
    avec, pour chacune, le decoupage, les 31 attributs, le score brut, la probabilite
    calibree et les contributions SHAP calcules par Python. La CI verifie que
    web/moteur-url.js retrouve exactement les memes valeurs.

Pourquoi exporter les tables Unicode : les attributs utilisent str.lower(), isdigit(),
isupper(), le \\b de re, strip() et le codec idna de Python. Les navigateurs ont chacun
leur version d'Unicode ; avec les tables de CE Python, le resultat ne depend plus du
telephone. Seule exception, documentee dans ml/README.md : la normalisation NFKC d'un nom
de domaine international qui contient des diacritiques combinants (voir _idna2003).

Le modele charge est verifie par son empreinte (models/SHA256SUMS) avant tout.

Usage (depuis ml/) :
    python exporter_web.py
"""

import hashlib
import json
import platform
import random
import re
import sys
import unicodedata
from pathlib import Path

import encodings.idna as idna2003
import joblib
import lightgbm
import numpy as np
import rapidfuzz
import tldextract

import features as F
import modeles as M
from modeles import verifier_empreinte

RACINE = Path(__file__).resolve().parent
DEPOT = RACINE.parent
SORTIE_MODELE = DEPOT / "web" / "modele" / "url-lgbm.js"
SORTIE_REFERENCE = DEPOT / "tests" / "parite" / "reference.json"
FORMAT = 1
MAX_CP = 0x110000


# --------------------------------------------------------------------------
# Outils
# --------------------------------------------------------------------------

def empreinte_texte(chemin):
    """sha256 d'un fichier source, fins de ligne normalisees (git peut extraire en CRLF)."""
    return hashlib.sha256(Path(chemin).read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def plages(predicat):
    """Ensemble de points de code -> liste plate [debut, longueur, ecart, longueur, ...]
    ou chaque debut est donne par rapport a la fin de la plage precedente."""
    out, debut, prec_fin = [], None, -1
    for cp in range(MAX_CP):
        if predicat(cp):
            if debut is None:
                debut = cp
        elif debut is not None:
            out += [debut - prec_fin - 1, cp - debut]
            prec_fin, debut = cp - 1, None
    if debut is not None:
        out += [debut - prec_fin - 1, MAX_CP - debut]
    return out


def flottant32_bas(x):
    """Plus grand float32 <= x, ecrit avec le moins de chiffres possible.
    LightGBM compare un attribut float32 (converti en double) a un seuil double :
    pour tout float32 v, v <= x  <=>  v <= flottant32_bas(x)."""
    f = np.float32(x)
    if float(f) > x:
        f = np.nextafter(f, np.float32(-np.inf))
    court = float(str(f))
    if np.float32(court) != f:     # double arrondi improbable : on garde la valeur exacte
        court = float(f)
    return court


def f32(x):
    return float(np.float32(x))


# --------------------------------------------------------------------------
# Tables Unicode du Python d'entrainement
# --------------------------------------------------------------------------

def _minuscules():
    """str.lower() caractere par caractere, sauf le sigma majuscule (regle de contexte).
    Codage : suites [debut, nombre, pas, decalage] et cas a plusieurs caracteres."""
    simples, multiples = {}, []
    for cp in range(MAX_CP):
        if cp == 0x3A3:
            continue
        c = chr(cp)
        m = c.lower()
        if m != c:
            if len(m) == 1:
                simples[cp] = ord(m) - cp
            else:
                multiples.append([cp, m])
    suites, cps, i = [], sorted(simples), 0
    while i < len(cps):
        debut, dec = cps[i], simples[cps[i]]
        pas, n = 1, 1
        if i + 1 < len(cps) and simples[cps[i + 1]] == dec and cps[i + 1] - debut in (1, 2):
            pas = cps[i + 1] - debut
            while i + n < len(cps) and cps[i + n] == debut + n * pas and simples[cps[i + n]] == dec:
                n += 1
        suites += [debut, n, pas, dec]
        i += n
    return {"suites": suites, "multiples": multiples}


def _contexte_sigma():
    """Ensembles Cased et Case_Ignorable vus par Python, deduits de son propre lower() :
    t1 = lower("A" + x + "Σ") finit par ς  <=>  x ignorable ou casse ;
    t2 = lower("1" + x + "Σ") finit par ς  <=>  x non ignorable et casse."""
    ign, casse = set(), set()
    for cp in range(MAX_CP):
        x = chr(cp)
        t1 = ("A" + x + "Σ").lower()[-1] == "ς"
        t2 = ("1" + x + "Σ").lower()[-1] == "ς"
        if t1 and not t2:
            ign.add(cp)
        if t2:
            casse.add(cp)
    return plages(ign.__contains__), plages(casse.__contains__)


def _nfkc_netloc():
    """Caracteres que urlsplit refuse dans le nom d'hote (_checknetloc) : leur forme NFKC
    contient / ? # @ ou :. La verification ne depend que de chaque caractere."""
    out = []
    for cp in range(0x80, MAX_CP):
        n = unicodedata.normalize("NFKC", chr(cp))
        if any(s in n for s in "/?#@:"):
            out.append(cp)
    s = set(out)
    return plages(s.__contains__)


def _idna2003():
    """Ce qu'il faut pour reproduire bytes.decode("idna") (IDNA 2003) :
    - rejet : caracteres que nameprep modifie ou interdit quand ils sont seuls ;
    - d1, d2 : classes bidi R/AL et L d'Unicode 3.2 ;
    - compose : caracteres qui peuvent changer la forme NFKC d'une chaine par leur
      contexte (classe combinatoire non nulle, ou second element d'une composition).
    Si une etiquette ne contient aucun caractere « compose », nameprep(s) == s se
    decide caractere par caractere : le resultat est exact. Sinon, le navigateur utilise
    sa propre normalisation NFKC (limite documentee)."""
    u32 = unicodedata.ucd_3_2_0
    rejet = set()
    for cp in range(MAX_CP):
        c = chr(cp)
        try:
            if idna2003.nameprep(c) != c:
                rejet.add(cp)
        except UnicodeError:
            rejet.add(cp)
    compose = {cp for cp in range(MAX_CP) if u32.combining(chr(cp))}
    for cp in range(MAX_CP):
        d = u32.decomposition(chr(cp))
        if d and not d.startswith("<"):
            parts = d.split()
            if len(parts) == 2:
                compose.add(int(parts[1], 16))
    compose |= set(range(0x1161, 0x1176)) | set(range(0x11A8, 0x11C3))  # jamos V et T
    return {
        "rejet": plages(rejet.__contains__),
        "d1": plages(lambda cp: u32.bidirectional(chr(cp)) in ("R", "AL")),
        "d2": plages(lambda cp: u32.bidirectional(chr(cp)) == "L"),
        "compose": plages(compose.__contains__),
    }


def tables_unicode():
    ign, casse = _contexte_sigma()
    return {
        "version": unicodedata.unidata_version,
        "minuscules": _minuscules(),
        "chiffre": plages(lambda cp: chr(cp).isdigit()),
        "decimal": plages(lambda cp: chr(cp).isdecimal()),
        "majuscule": plages(lambda cp: chr(cp).isupper()),
        "mot": plages(lambda cp: chr(cp).isalnum() or cp == 0x5F),
        "espace": plages(lambda cp: chr(cp).isspace()),
        "sigma_ignorable": ign,
        "sigma_casse": casse,
        "nfkc_netloc": _nfkc_netloc(),
        "idna2003": _idna2003(),
    }


# --------------------------------------------------------------------------
# Arbres
# --------------------------------------------------------------------------

def aplatir(arbre, categorielles):
    """Arbre de dump_model() -> tableaux en ordre prefixe (noeud, gauche, droite).
    s : attribut du noeud (-1 = feuille) ; t : seuil (float32 bas) ou indice dans c ;
    c : ensembles de categories envoyees a gauche ; v : valeurs des feuilles ;
    n : nombre d'exemples d'entrainement par noeud (pour les contributions SHAP)."""
    s, t, v, n, c = [], [], [], [], []

    def visite(nd):
        if "split_index" not in nd:
            s.append(-1)
            v.append(nd["leaf_value"])
            n.append(nd.get("leaf_count", 0))
            return
        f = nd["split_feature"]
        s.append(f)
        n.append(nd["internal_count"])
        if f in categorielles:
            assert nd["decision_type"] == "==" and nd["missing_type"] == "NaN" and not nd["default_left"], nd
            c.append([int(x) for x in str(nd["threshold"]).split("||")])
            t.append(len(c) - 1)
        else:
            assert nd["decision_type"] == "<=" and nd["missing_type"] == "None", nd
            seuil = float(nd["threshold"])
            assert np.isfinite(seuil), nd
            t.append(flottant32_bas(seuil))
        visite(nd["left_child"])
        visite(nd["right_child"])

    visite(arbre)
    return {"s": s, "t": t, "v": v, "n": n, "c": c}


# --------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------

def charger_modele():
    chemin = M.DOSSIER_MODELES / "lgbm.joblib"
    verifier_empreinte(chemin)  # pickle : empreinte de models/SHA256SUMS avant chargement
    b = joblib.load(chemin)
    sommes = M._lire_empreintes(M.DOSSIER_MODELES)
    return b, sommes["lgbm.joblib"]


def donnees_modele(b, sha_modele):
    booster, calib = b["booster"], b["calib"]
    dump = booster.dump_model()
    assert dump["objective"].startswith("binary sigmoid:1"), dump["objective"]
    assert dump["feature_names"] == M.NOMS_COLONNES, dump["feature_names"]
    assert len(dump["tree_info"]) == booster.num_trees() == booster.best_iteration
    categorielles = [len(M.NOMS_COLONNES) - 1]

    ex = F._EXTRACT._get_tld_extractor()
    assert not list(F._EXTRACT.extra_suffixes)
    for regle in ex.public_tlds + ex.private_tlds:
        assert "xn--" not in regle, regle  # le moteur compare des etiquettes decodees

    lr = calib.lr
    assert list(lr.classes_) == [0, 1] and lr.coef_.shape == (1, 1)

    # Mesures du test temporel (reports/metriques.json), affichees dans les details analyste
    ev = json.loads((RACINE / "reports" / "metriques.json").read_text(encoding="utf-8"))["lgbm"]["eval"]
    mesures = {"auc": ev["auc"], "seuils": []}
    for s in ev["seuils"]:
        assert s["seuil"] == b["seuils"][s["cible"]], "metriques.json ne correspond pas au modele"
        mesures["seuils"].append({k: s[k] for k in ("cible", "seuil", "rappel", "tfp", "tfp_bas", "tfp_haut", "n_legit")})

    return {
        "format": FORMAT,
        "provenance": {
            "modele": "ml/models/lgbm.joblib",
            "modele_sha256": sha_modele,
            "features_sha256": empreinte_texte(RACINE / "features.py"),
            "modeles_sha256": empreinte_texte(RACINE / "modeles.py"),
            "entraine_le": b.get("entraine_le", ""),
            "exporte_par": "ml/exporter_web.py",
            "python": platform.python_version(),
            "lightgbm": lightgbm.__version__,
            "tldextract": tldextract.__version__,
            "rapidfuzz": rapidfuzz.__version__,
            "unicode": unicodedata.unidata_version,
        },
        "attributs": M.NOMS_COLONNES,
        "categorielles": categorielles,
        "vocab_tld": b["vocab_tld"],
        "calibration": {"coef": float(lr.coef_[0][0]), "intercept": float(lr.intercept_[0]),
                        "borne": 1e-7},
        "seuils": {"r80": b["seuils"][0.8], "r90": b["seuils"][0.9], "r95": b["seuils"][0.95]},
        "mesures": mesures,
        "arbres": [aplatir(t["tree_structure"], categorielles) for t in dump["tree_info"]],
        "listes": {
            "marques": F.MARQUES,
            "confusables": F.CONFUSABLES,
            "multi": [list(p) for p in F._MULTI],
            "raccourcisseurs": sorted(F.RACCOURCISSEURS),
            "mots_suspects": F.MOTS_SUSPECTS,
            "noms_marques": [[nom, sorted(vrais)] for nom, vrais in F._NOMS_MARQUES.items()],
            "psl_publiques": ex.public_tlds,
            "psl_privees": ex.private_tlds,
        },
        "unicode": tables_unicode(),
    }


def ecrire_modele(donnees):
    texte = json.dumps(donnees, ensure_ascii=True, separators=(",", ":"))
    SORTIE_MODELE.parent.mkdir(parents=True, exist_ok=True)
    entete = ("/* Genere par ml/exporter_web.py : ne pas modifier a la main. Donnees seulement "
              "(tests/parite.test.js le verifie). */\n")
    SORTIE_MODELE.write_text(entete + "window.PDS_MODELE_URL=" + texte + ";\n",
                             encoding="ascii", newline="\n")
    return len(texte)


# --------------------------------------------------------------------------
# Jeu de reference pour la parite
# --------------------------------------------------------------------------

# Cas choisis a la main : exemples publies, et chaque branche du code de decoupage.
CAS_LIMITES = [
    "https://www.impots.gouv.fr/portail/particulier", "https://www.impots-gouv.fr/portail/particulier",
    "accounts.google.com/signin/v2/identifier", "accounts.googIe.com/signin/v2/identifier",
    "app.letsdefend.io/login", "app.letzdefend.io/login", "github.com/login", "githib.com/login",
    "fr.wikipedia.org/wiki/Hameconnage", "fr.wikipedla.org/wiki/Hameconnage",
    "www.service-public.fr/particuliers/vosdroits/R1281", "www.service-publlc.fr/particuliers/vosdroits/R1281",
    "http://faceb00k.com", "paypa1.com/signin", "rnicrosoft.com", "vvhatsapp.com", "аpple.com",
    "http://xn--pple-43d.com/", "http://xn--80ak6aa92e.com", "http://xn--sdkss-okc551dxdr32l.example/",
    "http://XN--PPLE-43D.COM", "http://xn--com-.example", "http://xn--.example", "http://xn--xn--abc-def.example",
    "http://xn--zz-zzz.example", "http://xn--a.example", "http://xn--ls8h.example", "http://a.xn--p1ai",
    "http://xn--e1afmkfd.xn--p1ai/путь", "http://пример.рф", "http://ΣΑΣ.example/ΑΣ", "http://xΣ.example/Σ1",
    "http://bit.ly/3xYz", "https://tinyurl.com/abc", "http://192.168.0.1/login.php", "http://0xC0A80001/x",
    "http://3232235521/", "http://192.168.000.001/", "http://256.1.1.1/", "http://1.2.3.4.5/",
    "http://[::1]/", "http://[2001:db8::1]:8080/a", "http://[fe80::1%25eth0]/", "http://[::ffff:1.2.3.4]/",
    "http://[1.2.3.4]/", "http://[v1.fe]/", "http://[vz.x]/", "http://[::1/", "http://::1]/",
    "http://ladiesfirst-privileges[.]com/x", "http://user:pass@host.example:443/p?q=1",
    "http://a@b@evil.example/", "http://exemple.com:８０/", "http://exemple.com:/", "http://exemple.com:abc/",
    "http://exemple.com./", "http://exemple.com。fr/", "http://exemple．com/", "http://a.b.c.d.exemple.co.uk/",
    "http://foo.github.io/login", "http://x.pages.dev/", "http://www.ck/", "http://abc.ck/", "http://a.b.ck/",
    "http://city.kawasaki.jp/", "http://x.city.kawasaki.jp/", "http://x.y.kawasaki.jp/", "http://localhost/",
    "http://exemple", "", " ", "   http://espace.example/   ", "\thttp://tab.example/\n", "http://ta\tb.exa\nmple/",
    "http://exemple.com/a%20b%2Fc%zz%4", "http://exemple.com/%C3%A9t%C3%A9", "http://exemple.com/%E2%82", "http://exemple.com/%FF%FE%41",
    "http://exemple.com/é%41", "http://exemple.com/index.php", "http://exemple.com/index.php?x=1",
    "http://exemple.com/index.phpx", "http://exemple.com/index.php_", "http://exemple.com/index.phpé",
    "http://exemple.com/index.php٣", "http://exemple.com/index.php/a", "http://exemple.com/INDEX.PHP",
    "http://exemple.com/?a=1&b=&&c&=d", "http://exemple.com/?", "http://exemple.com/#frag?x=1",
    "http://exemple.com//double//barre", "http://exemple.com/login/verify/account", "http://secure-login-paypal.example/",
    "http://paypal.com.secure.example/", "http://login.microsoftonline.com.evil.example/", "https://amazon.fr/", "https://amazon.com.fr.example/",
    "http://mabanque.bnpparibas/", "http://bnpparibas.example/", "ftp://exemple.com/fichier", "HTTPS://EXEMPLE.COM/",
    "//exemple.com/x", "a+b-c.d://exemple.com/", "1http://exemple.com", "http:/exemple.com", "http:exemple.com",
    "javascript:alert(1)", "mailto:a@b.example", "http://exemple.com/<script>alert(1)</script>",
    "http://℀.example/", "http://a℀b.example/", "http://ｅｘｅｍｐｌｅ.com/", "http://exemple.com\u3000/",
    "http://exemple.com/\u0130stanbul", "http://\u0130.example/", "http://\u212a.example/",
    "http://\u0663\u0663\u0663\u0663\u0663\u0663\u0663\u0663/", "http://exemple.com:\u0663/",
    "http://\U0001F600.example/", "http://exemple.com/\U0001F600\U0001F600", "http://\ud800.example/",
    "http://exemple.com/\x01\x02", "\x01http://exemple.com", "http://exemple.com/" + "a" * 300,
    "http://" + "b" * 70 + ".example/", "http://" + ".".join(["c"] * 40) + ".example/",
]

ETIQUETTES = ["login", "secure", "account", "verify", "mail", "app", "web", "my", "portal", "update",
              "colis", "compte", "paiement", "service", "client", "info", "online", "cloud", "pay", "auth"]
CHEMINS = ["login", "signin", "index.php", "wp-admin", "verify", "account", "update", "secure",
           "connexion", "facture", "colis", "paiement", "a", "b", "img", "static", "api", "v2", "fr", "x"]


def _etiquette(rng):
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-"
    return "".join(rng.choice(alphabet) for _ in range(rng.randint(1, 14))).strip("-") or "a"


def _unicode_aleatoire(rng):
    blocs = [(0x0400, 0x04FF), (0x0370, 0x03FF), (0x0300, 0x036F), (0x0590, 0x06FF), (0x13A0, 0x13FF),
             (0xFF00, 0xFFEF), (0x2100, 0x214F), (0x00A0, 0x024F), (0x1F100, 0x1F1FF), (0x4E00, 0x4E3F),
             (0x1E00, 0x1EFF), (0x0E00, 0x0E7F), (0xAC00, 0xAC3F), (0x1100, 0x11FF)]
    a, b = rng.choice(blocs)
    return "".join(chr(rng.randint(a, b)) for _ in range(rng.randint(1, 6)))


def _typosquat(rng, marque):
    nom, _, suffixe = marque.partition(".")
    if not nom:
        return marque
    i = rng.randrange(len(nom))
    op = rng.randint(0, 5)
    inv = {v: k for k, v in F.CONFUSABLES.items() if len(k) == 1}
    if op == 0 and nom[i] in inv:
        nom = nom[:i] + inv[nom[i]] + nom[i + 1:]
    elif op == 1:
        nom = nom[:i] + nom[i + 1:]
    elif op == 2:
        nom = nom[:i] + rng.choice("abcdefghijklmnopqrstuvwxyz") + nom[i:]
    elif op == 3:
        nom = nom.replace("m", "rn", 1).replace("w", "vv", 1)
    elif op == 4:
        nom = nom + "-" + rng.choice(ETIQUETTES)
    else:
        suffixe = rng.choice(["com", "net", "xyz", "top", "info", "fr", "app"])
    return nom + "." + suffixe


def generer_urls(n, graine=2026):
    """URL synthetiques couvrant les branches du code : TLD du vocabulaire et de la liste
    publique, hebergeurs prives, imitations de marques, IP, ports, punycode, Unicode."""
    rng = random.Random(graine)
    ex = F._EXTRACT._get_tld_extractor()
    tlds = [t for t in ex.public_tlds if "*" not in t and "!" not in t]
    prives = [t for t in ex.private_tlds if "*" not in t and "!" not in t]
    out = []
    for _ in range(n):
        genre = rng.randint(0, 9)
        if genre <= 2:
            hote = ".".join(_etiquette(rng) for _ in range(rng.randint(1, 3))) + "." + rng.choice(tlds)
        elif genre == 3:
            hote = _etiquette(rng) + "." + rng.choice(prives)
        elif genre == 4:
            hote = _typosquat(rng, rng.choice(F.MARQUES))
            if rng.random() < 0.3:
                hote = rng.choice(ETIQUETTES) + "." + hote
        elif genre == 5:
            hote = rng.choice(F.MARQUES) + "." + _etiquette(rng) + "." + rng.choice(["com", "xyz", "top"])
        elif genre == 6:
            hote = ".".join(str(rng.randint(0, 300)) for _ in range(4))
            if rng.random() < 0.2:
                hote = rng.choice(["0x%08x" % rng.getrandbits(32), str(rng.getrandbits(32)), "[::1]", "[2001:db8::%x]" % rng.getrandbits(16)])
        elif genre == 7:
            u = _unicode_aleatoire(rng)
            try:
                hote = "xn--" + u.encode("punycode").decode("ascii") + "." + rng.choice(["com", "fr", "example"])
            except UnicodeError:
                hote = u + ".example"
            if rng.random() < 0.3:
                hote = hote.upper()
        elif genre == 8:
            hote = _unicode_aleatoire(rng) + rng.choice([".com", ".example", "。com", ".рф"])
        else:
            # casse melangee : le « I » de googIe.com doit rester visible pour le squelette
            hote = "".join(c.upper() if rng.random() < 0.2 else c for c in rng.choice(F.MARQUES))
        if rng.random() < 0.15:
            hote += ":" + rng.choice(["8080", "443", "80", "", "x"])
        if rng.random() < 0.05:
            hote = rng.choice(["user@", "a:b@", "@"]) + hote
        chemin = "/".join(rng.choice(CHEMINS) for _ in range(rng.randint(0, 4)))
        if rng.random() < 0.2:
            chemin += rng.choice(["%20", "%C3%A9", "%2F", "%zz", "%E2%82%AC", "%FF"])
        url = rng.choice(["http://", "https://", "", "HTTP://", "hxxp://"]) + hote + ("/" + chemin if chemin or rng.random() < 0.5 else "")
        if rng.random() < 0.3:
            url += "?" + "&".join(rng.choice(["a=1", "b=", "", "c", "ref=" + _etiquette(rng)]) for _ in range(rng.randint(1, 4)))
        if rng.random() < 0.1:
            url += "#" + _etiquette(rng)
        out.append(url)
    return out


def jeu_reference(b, n_synth=2500, chaque_shap=6):
    booster, vocab = b["booster"], b["vocab_tld"]
    urls = list(CAS_LIMITES) + [u for _, vrai, faux in F.PAIRES_ABLATION for u in (vrai, faux)]
    urls += generer_urls(n_synth)
    X = M.construire_X(urls, vocab)
    brut = booster.predict(X, raw_score=True)
    proba = b["calib"].predict(booster.predict(X))
    contrib = booster.predict(X, pred_contrib=True)
    cas = []
    for i, u in enumerate(urls):
        d = F.decouper(u)
        e = {
            "url": u,
            "decoupe": [d[0], d[1], d[2], d[3], d[4], d[5], d[6], bool(d[7]), int(d[8])],
            "x": [f32(v) for v in X[i]],
            "brut": float(brut[i]),
            "proba": float(proba[i]),
        }
        if i < len(CAS_LIMITES) or i % chaque_shap == 0:
            e["shap"] = [float(v) for v in contrib[i]]
        cas.append(e)
    return cas


def main():
    b, sha = charger_modele()
    print("Tables Unicode et arbres...", flush=True)
    donnees = donnees_modele(b, sha)
    taille = ecrire_modele(donnees)
    print(f"  {SORTIE_MODELE.relative_to(DEPOT)} : {len(donnees['arbres'])} arbres, {taille / 1024:.0f} Kio")
    cas = jeu_reference(b)
    SORTIE_REFERENCE.parent.mkdir(parents=True, exist_ok=True)
    # une URL par ligne : les evolutions du jeu restent lisibles dans une pull request
    lignes = ",\n".join(json.dumps(c, ensure_ascii=True, separators=(",", ":")) for c in cas)
    SORTIE_REFERENCE.write_text(
        '{"format":%d,"modele_sha256":"%s","cas":[\n%s\n]}\n' % (FORMAT, sha, lignes),
        encoding="ascii", newline="\n")
    print(f"  {SORTIE_REFERENCE.relative_to(DEPOT)} : {len(cas)} cas")


if __name__ == "__main__":
    sys.exit(main())
