"""
Construction du corpus d'entrainement -> data/corpus.csv

Colonnes : url, label (1 = phishing), first_seen (AAAA-MM-JJ ou vide), source, synthetique

Sources
  1. OpenPhish, historique Git (phishing HORODATE, oct. 2024 -> aujourd'hui).
     Le flux public est versionne sur GitHub : chaque commit est un instantane date.
  2. ealvaradob/phishing-dataset, fichier urls.json (phishing + legitime, non date,
     anterieur a 2024). Sert uniquement a l'entrainement.
  3. Common Crawl (legitime HORODATE) : URL reelles de domaines francais et
     internationaux, sur plusieurs collectes reparties dans la meme fenetre que
     OpenPhish — les deux classes couvrent la meme epoque.
     Repli automatique sur les sitemaps des sites si l'index Common Crawl sature.
  4. Typosquats synthetiques generes a partir des marques (entrainement seulement,
     jamais dans le test : on mesurerait notre generateur, pas le modele).

Les six domaines de l'audit d'ablation sont exclus de tout le corpus.

Usage :
    python collect.py              # collecte complete (~20-40 min, reprise possible)
    python collect.py --rapide     # premiere passe en ~5 min pour verifier la chaine
"""

import argparse
import os
import csv
import gzip
import io
import json
import random
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, quote

import features as F

# Avertissement sans consequence de huggingface_hub sous Windows (liens symboliques).
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

RACINE = Path(__file__).resolve().parent
DATA = RACINE / "data"
RAW = DATA / "raw"
UA = "phishing-url-classifier/1.0 (projet etudiant cybersecurite; collecte ponctuelle)"
random.seed(42)

# Domaines legitimes francais a echantillonner (en plus des marques FR).
DOMAINES_FR = sorted(set(F.MARQUES_FR) - F.DOMAINES_ABLATION | {
    "legifrance.gouv.fr", "education.gouv.fr", "interieur.gouv.fr", "economie.gouv.fr",
    "cybermalveillance.gouv.fr", "data.gouv.fr", "info.gouv.fr", "elysee.fr",
    "cnil.fr", "ssi.gouv.fr", "pole-emploi.fr", "mesdemarches.agriculture.gouv.fr",
    "lemonde.fr", "lefigaro.fr", "francetvinfo.fr", "ouest-france.fr", "liberation.fr",
    "20minutes.fr", "leparisien.fr", "meteofrance.com", "pagesjaunes.fr", "allocine.fr",
    "marmiton.org", "fnac.com", "darty.com", "cdiscount.com", "decathlon.fr",
    "leroymerlin.fr", "boulanger.com", "carrefour.fr", "auchan.fr", "lyon.fr",
    "grandlyon.com", "tcl.fr", "auvergne-rhone-alpes.fr", "univ-lyon1.fr",
    "univ-lyon2.fr", "insa-lyon.fr", "onisep.fr", "parcoursup.fr", "etudiant.gouv.fr",
    "messervices.etudiant.gouv.fr", "hellowork.com", "welcometothejungle.com",
    "apec.fr", "indeed.fr", "seloger.com", "pap.fr", "blablacar.fr", "ratp.fr",
    "airfrance.fr", "macif.fr", "maif.fr", "axa.fr", "matmut.fr", "mgen.fr",
})
DOMAINES_INTL_REPLI = [
    "microsoft.com", "apple.com", "amazon.com", "wikipedia.org", "youtube.com",
    "stackoverflow.com", "reddit.com", "medium.com", "bbc.co.uk", "nytimes.com",
    "theguardian.com", "booking.com", "airbnb.com", "spotify.com", "zoom.us",
    "salesforce.com", "atlassian.com", "slack.com", "notion.so", "cloudflare.com",
    "mozilla.org", "python.org", "npmjs.com", "docker.com", "ubuntu.com",
    "imdb.com", "ebay.com", "etsy.com", "paypal.com", "adobe.com",
]


def log(*a):
    print(*a, flush=True)


INCIDENTS = Counter()          # erreurs reseau absorbees, resumees au lieu d'un mur de messages
_VERROU = threading.Lock()


def http_get(url, timeout=45, essais=3, pause=5.0):
    """GET robuste. Toute erreur reseau (503/504, coupure en cours de transfert,
    IncompleteRead, delai depasse...) est reessayee puis absorbee : la fonction renvoie
    None au lieu de faire planter la collecte. Les incidents sont comptes dans INCIDENTS."""
    # une adresse lue dans un robots.txt distant peut viser file:// ou ftp:// : seul le web est suivi
    if not url.lower().startswith(("http://", "https://")):
        return None
    for i in range(essais):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
                if r.headers.get("Content-Encoding") == "gzip" or url.endswith(".gz"):
                    try:
                        data = gzip.decompress(data)
                    except OSError:
                        pass
                return data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (401, 404, 410):
                return None                      # reessayer ne changera rien
            raison = f"HTTP {e.code}"
        except Exception as e:                   # noqa: BLE001 — IncompleteRead, timeouts, DNS...
            raison = type(e).__name__
        with _VERROU:
            INCIDENTS[raison] += 1
        if i < essais - 1:
            time.sleep(pause * (2 ** i))
    return None


def resume_incidents():
    if not INCIDENTS:
        return "aucun incident reseau"
    detail = ", ".join(f"{k} x{v}" for k, v in INCIDENTS.most_common())
    INCIDENTS.clear()
    return f"incidents reseau absorbes : {detail}"


def nettoyer(url):
    """Retire les parametres de suivi (utm_, fbclid...) qui dupliquent une meme page."""
    try:
        p = urlsplit(url.strip())
        q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if not re.match(r"(utm_|fbclid|gclid|mc_|_ga|msclkid|yclid)", k, re.I)]
        return urlunsplit((p.scheme, p.netloc, p.path, urlencode(q, doseq=True), ""))
    except ValueError:
        return url.strip()


def a_un_chemin(url):
    reste = F.retirer_schema(url)
    _, _, apres = reste.partition("/")
    return bool(apres.strip("/")) or "?" in reste


# --------------------------------------------------------------------------
# 1. OpenPhish
# --------------------------------------------------------------------------

def collecter_openphish(tous_commits=False, maxi=None):
    depot = RAW / "openphish"
    try:
        if (depot / ".git").exists():
            log("OpenPhish : mise a jour du depot...")
            subprocess.run(["git", "-C", str(depot), "pull", "--quiet"], check=True)
        else:
            log("OpenPhish : clonage de l'historique (~15 Mo)...")
            depot.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["git", "clone", "--quiet",
                            "https://github.com/openphish/public_feed", str(depot)], check=True)
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        log(f"  ! git indisponible ({e}). Repli sur le flux du jour, SANS historique :")
        log("    la decoupe temporelle sera impossible. Installe Git pour Windows.")
        txt = http_get("https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt") or ""
        auj = date.today().isoformat()
        return [(u, 1, auj, "openphish") for u in txt.split() if u.startswith("http")]

    log_git = subprocess.run(
        ["git", "-C", str(depot), "log", "--format=%H %ad", "--date=short", "--", "feed.txt"],
        capture_output=True, text=True, check=True).stdout.split("\n")
    commits = []
    vus_jour = set()
    for ligne in log_git:  # du plus recent au plus ancien
        if not ligne.strip():
            continue
        h, d = ligne.split()
        if tous_commits or d not in vus_jour:
            commits.append((d, h))
            vus_jour.add(d)
    commits.reverse()
    log(f"  {len(commits)} instantanes, du {commits[0][0]} au {commits[-1][0]}")

    premier = {}
    for i, (d, h) in enumerate(commits):
        txt = subprocess.run(["git", "-C", str(depot), "show", f"{h}:feed.txt"],
                             capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
        for u in txt.split():
            if u.startswith("http"):
                u = nettoyer(u)
                if u not in premier:
                    premier[u] = d
        if (i + 1) % 200 == 0:
            log(f"  ... {i + 1}/{len(commits)} instantanes, {len(premier)} URL")
    lignes = [(u, 1, d, "openphish") for u, d in premier.items()]
    if maxi and len(lignes) > maxi:
        lignes = random.sample(lignes, maxi)
    log(f"  OpenPhish : {len(lignes)} URL de phishing horodatees")
    return lignes


# --------------------------------------------------------------------------
# 2. ealvaradob/phishing-dataset
# --------------------------------------------------------------------------

def collecter_ealvaradob(maxi_par_classe):
    try:
        from huggingface_hub import hf_hub_download
        chemin = hf_hub_download("ealvaradob/phishing-dataset", "urls.json", repo_type="dataset")
    except Exception as e:  # noqa: BLE001
        log(f"  ! telechargement impossible ({e}) — source ignoree")
        return []
    with open(chemin, encoding="utf-8") as f:
        donnees = json.load(f)
    par_classe = defaultdict(list)
    for d in donnees:
        u = str(d.get("text", "")).strip()
        if not u or " " in u:
            continue
        # Filtre symetrique : seulement les URL avec un chemin, dans les DEUX classes.
        # Sinon les legitimes « google.com » contre des phishing complets enseignent
        # au modele que la longueur trahit le phishing (piege n°2 de la phase 1).
        if not a_un_chemin(u):
            continue
        par_classe[int(d.get("label", 0))].append(u)
    lignes = []
    for lab, urls in par_classe.items():
        if len(urls) > maxi_par_classe:
            urls = random.sample(urls, maxi_par_classe)
        lignes += [(nettoyer(u), lab, "", "ealvaradob") for u in urls]
    log(f"  ealvaradob : {sum(1 for l in lignes if l[1]==1)} phishing, "
        f"{sum(1 for l in lignes if l[1]==0)} legitimes (avec chemin, non dates)")
    return lignes


# --------------------------------------------------------------------------
# 3. Legitime horodate : Common Crawl, repli sitemaps
# --------------------------------------------------------------------------

def collectes_cc(debut, nb):
    txt = http_get("https://index.commoncrawl.org/collinfo.json")
    try:
        infos = [c for c in json.loads(txt) if c.get("from", "")[:10] >= debut] if txt else []
    except ValueError:
        infos = []
    infos.sort(key=lambda c: c["from"])
    if len(infos) <= nb:
        return infos
    pas = (len(infos) - 1) / (nb - 1) if nb > 1 else 0
    return [infos[round(i * pas)] for i in range(nb)]


def _lire_cache(chemin):
    if chemin.exists():
        return [json.loads(l) for l in chemin.read_text(encoding="utf-8").splitlines() if l.strip()]
    return None


def _ecrire_cache(chemin, lignes):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    chemin.write_text("\n".join(json.dumps(x) for x in lignes), encoding="utf-8")


def cc_domaine(collecte, domaine, limite):
    """URL legitimes d'un domaine dans une collecte Common Crawl.
    Renvoie None si l'index n'a pas repondu (rien n'est mis en cache : on retentera)."""
    cache = RAW / "cc" / f"{collecte['id']}__{domaine}.jsonl"
    deja = _lire_cache(cache)
    if deja is not None:
        return deja
    base = collecte["cdx-api"] + f"?url={quote(domaine)}&matchType=domain&output=json"
    n = http_get(base + "&showNumPages=true", timeout=45, essais=2)
    if n is None:
        return None
    try:
        pages = int(json.loads(n)["pages"])
    except (ValueError, KeyError, TypeError):
        return None
    lignes = []
    if pages > 0:
        txt = http_get(base + f"&page={random.randrange(pages)}&limit={limite * 4}"
                       "&fl=url,timestamp,status,mime", timeout=60, essais=2)
        if txt is None:
            return None
        for l in txt.splitlines():
            try:
                o = json.loads(l)
            except json.JSONDecodeError:
                continue
            if o.get("status") == "200" and "html" in o.get("mime", ""):
                lignes.append({"url": o["url"], "timestamp": o["timestamp"], "src": "commoncrawl"})
        random.shuffle(lignes)
        lignes = lignes[:limite]
    _ecrire_cache(cache, lignes)   # meme vide : « absent de cette collecte » est une reponse
    time.sleep(1.0)                # politesse envers l'index
    return lignes


def sitemap_domaine(domaine, limite):
    """URL reelles tirees du sitemap du site, avec leur date lastmod. Rapide et fiable."""
    cache = RAW / "sitemaps" / f"{domaine}.jsonl"
    deja = _lire_cache(cache)
    if deja is not None:
        return deja
    robots, hote = None, domaine
    for h in (domaine, "www." + domaine):      # les redirections sont suivies
        robots = http_get(f"https://{h}/robots.txt", timeout=20, essais=1)
        if robots is not None:
            hote = h
            break
    cartes = re.findall(r"(?im)^\s*sitemap:\s*(\S+)", robots or "") or [f"https://{hote}/sitemap.xml"]
    trouves, vues = [], 0
    while cartes and len(trouves) < limite * 3 and vues < 6:
        carte = cartes.pop(0)
        vues += 1
        xml = http_get(carte, timeout=30, essais=1)
        if not xml:
            continue
        if "<sitemapindex" in xml:
            enfants = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
            random.shuffle(enfants)
            cartes = enfants[:4] + cartes
            continue
        for bloc in re.findall(r"<url>(.*?)</url>", xml, re.S):
            loc = re.search(r"<loc>\s*([^<\s]+)\s*</loc>", bloc)
            mod = re.search(r"<lastmod>\s*(\d{4}-\d{2}-\d{2})", bloc)
            if loc:
                trouves.append({"url": loc.group(1).replace("&amp;", "&"), "src": "sitemap",
                                "timestamp": mod.group(1).replace("-", "") if mod else ""})
    # On ne garde que les pages du site lui-meme (pas les CDN cites dans le sitemap).
    reg = F.domaine_enregistre("https://" + domaine)
    trouves = [t for t in trouves if F.domaine_enregistre(t["url"]) == reg]
    random.shuffle(trouves)
    trouves = trouves[:limite]
    _ecrire_cache(cache, trouves)
    return trouves


def collecter_legitimes(domaines, collectes, limite, etiquette, budget_cc_min):
    """Deux passes. 1) Sitemaps de tous les domaines en parallele (quelques minutes).
    2) Common Crawl, sequentiel et poli, dans un budget de temps : l'index est souvent
    sature, il complete les dates mais ne doit jamais bloquer la collecte."""
    lignes = {}

    def ajouter(recus):
        n = 0
        for o in recus:
            u = nettoyer(o["url"])
            if not u.startswith("http") or F.domaine_enregistre(u) in F.DOMAINES_ABLATION:
                continue
            ts = o.get("timestamp", "")
            d = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}" if len(ts) >= 8 else ""
            src = o.get("src", "commoncrawl")
            if u not in lignes:
                n += 1
            if u not in lignes or (d and (not lignes[u][0] or d < lignes[u][0])):
                lignes[u] = (d, src)
        return n

    log(f"  Sitemaps de {len(domaines)} domaines (en parallele)...")
    with ThreadPoolExecutor(max_workers=8) as pool:
        resultats = list(pool.map(lambda d: (d, sitemap_domaine(d, limite * 2)), domaines))
    vides = [d for d, r in resultats if not r]
    for _, r in resultats:
        ajouter(r)
    log(f"    {len(lignes)} URL ; {len(domaines) - len(vides)}/{len(domaines)} domaines ont un sitemap "
        f"exploitable ({resume_incidents()})")

    if not collectes:
        log("  Common Crawl injoignable : on continue avec les sitemaps seuls.")
        return [(u, 0, d, f"{src}-{etiquette}") for u, (d, src) in lignes.items()]

    fin = time.time() + budget_cc_min * 60
    echecs_suite, faits = 0, 0
    log(f"  Common Crawl, {len(collectes)} collectes par domaine, budget {budget_cc_min} min...")
    for i, dom in enumerate(domaines):
        if time.time() > fin:
            log(f"    budget atteint apres {faits} domaines : la suite est en cache pour la prochaine fois "
                "si tu relances, sinon on s'arrete la.")
            break
        if echecs_suite >= 5:
            log("    l'index ne repond plus depuis 5 domaines : arret de Common Crawl pour cette passe.")
            break
        recus, ok = [], True
        for c in collectes:
            r = cc_domaine(c, dom, limite)
            if r is None:          # index sature : inutile d'insister sur ce domaine
                ok = False
                break
            recus += r
        echecs_suite = 0 if ok or recus else echecs_suite + 1
        nouveaux = ajouter(recus)
        faits += 1
        log(f"    [{i + 1}/{len(domaines)}] {dom:<30} +{nouveaux:<4} total {len(lignes)}"
            + ("" if ok else "  (index sature, domaine partiel)"))
    log(f"    {resume_incidents()}")
    return [(u, 0, d, f"{src}-{etiquette}") for u, (d, src) in lignes.items()]


# CDN et domaines techniques sans pages HTML.
BRUIT_TRANCO = re.compile(r"(cdn|akamai|cloudfront|amazonaws|gstatic|googleapis|doubleclick"
                          r"|fbcdn|azureedge|edgekey|apple-dns|icloud-content|msftncsi|root-servers)")


def _tranco():
    from tranco import Tranco
    return Tranco(cache=True, cache_dir=str(RAW / "tranco"))


def domaines_tranco(n):
    try:
        liste = _tranco().list().top(n * 3)
        doms = [d for d in liste if not BRUIT_TRANCO.search(d) and d not in F.DOMAINES_ABLATION]
        return doms[:n]
    except Exception as e:  # noqa: BLE001
        log(f"  (paquet tranco indisponible : {e} — liste de repli)")
        return [d for d in DOMAINES_INTL_REPLI if d not in F.DOMAINES_ABLATION][:n]


def collecter_accueils(debut, nb_instantanes, par_instantane, rang_max):
    """Pages d'accueil legitimes (https://domaine/), datees par des listes Tranco historiques.

    Pourquoi : la moitie des phishing OpenPhish sont des domaines nus
    (https://xxx.pages.dev/), alors que les legitimes Common Crawl, sitemaps et
    ealvaradob ont presque tous un chemin. Sans cette source, le modele apprend
    « pas de chemin = phishing » — et le test, ou aucune legitime n'est un domaine nu,
    ne peut pas le voir. Chaque instantane est date du jour de la liste : les
    domaines tires dans une liste recente tombent dans la validation ou le test."""
    try:
        t = _tranco()
    except Exception as e:  # noqa: BLE001
        log(f"  ! paquet tranco indisponible ({e}) : pages d'accueil ignorees")
        return []
    d0 = date.fromisoformat(debut)
    d1 = date.today() - timedelta(days=2)
    pas = (d1 - d0) / max(nb_instantanes - 1, 1)
    premier = {}
    for i in range(nb_instantanes):
        jour = (d0 + pas * i).isoformat()
        try:
            liste = t.list(date=jour).top(rang_max)
        except Exception as e:  # noqa: BLE001
            log(f"    liste Tranco du {jour} indisponible ({type(e).__name__}) — ignoree")
            continue
        liste = [d for d in liste if not BRUIT_TRANCO.search(d)
                 and F.domaine_enregistre("https://" + d) not in F.DOMAINES_ABLATION]
        nouveaux = 0
        for d in random.sample(liste, min(par_instantane, len(liste))):
            u = f"https://{d}/"
            if u not in premier:
                premier[u] = jour
                nouveaux += 1
        log(f"    liste du {jour} : +{nouveaux} pages d'accueil (total {len(premier)})")
    return [(u, 0, d, "tranco-accueil") for u, d in premier.items()]


# --------------------------------------------------------------------------
# 4. Typosquats synthetiques
# --------------------------------------------------------------------------

_SOSIES = {"l": ["I", "1"], "o": ["0", "о"], "i": ["l", "1", "і"], "a": ["а", "@"],
           "e": ["е", "3"], "m": ["rn"], "w": ["vv"], "c": ["с"], "p": ["р"], "s": ["5", "ѕ"]}
_VOISINS = {"a": "qzs", "z": "aes", "e": "zrd", "r": "etf", "t": "ryg", "y": "tuh", "u": "yij",
            "i": "uok", "o": "ipl", "p": "olm", "s": "qdz", "d": "sfe", "f": "dgr", "g": "fht",
            "h": "gjy", "j": "hku", "k": "jli", "l": "kmo", "m": "lp", "n": "bjh", "b": "vnh",
            "v": "cbg", "c": "xvd", "x": "wcs", "w": "xs"}
_TLD_PIEGES = ["com", "net", "info", "top", "xyz", "online", "site", "live", "app", "help",
               "support", "click", "fr", "co", "io"]


def _variantes(domaine):
    nom, _, suffixe = domaine.partition(".")
    if domaine.startswith("mabanque."):
        nom, suffixe = "bnpparibas", "com"
    out = set()
    for i, ch in enumerate(nom):
        for s in _SOSIES.get(ch, []):
            out.add(nom[:i] + s + nom[i + 1:] + "." + suffixe)  # homoglyphe
        for v in _VOISINS.get(ch, ""):
            out.add(nom[:i] + v + nom[i + 1:] + "." + suffixe)  # faute de frappe
        if ch != "-":
            out.add(nom[:i] + nom[i + 1:] + "." + suffixe)      # omission
            out.add(nom[:i] + ch + nom[i:] + "." + suffixe)     # doublement
        if i < len(nom) - 1:
            out.add(nom[:i] + nom[i + 1] + nom[i] + nom[i + 2:] + "." + suffixe)  # inversion
    for t in _TLD_PIEGES:
        out.add(f"{nom}.{t}")                                     # changement d'extension
    out.add(domaine.replace(".", "-"))                           # impots-gouv-fr
    if "." in suffixe:
        out.add(nom + "-" + suffixe.replace(".", "-", suffixe.count(".") - 1))  # impots-gouv.fr
    for mot in ("secure", "login", "verif", "compte", "account", "support", "client"):
        out.add(f"{nom}-{mot}.{random.choice(_TLD_PIEGES)}")
        out.add(f"{domaine}.{mot}-{random.randint(10, 999)}.{random.choice(_TLD_PIEGES)}")  # sous-domaine
    out.discard(domaine)
    return [d for d in out if d and ".." not in d and not d.startswith((".", "-"))]


def generer_typosquats(chemins_reels, par_marque):
    """Typosquats des marques, habilles de chemins tires de VRAIS phishing anterieurs :
    sinon le modele apprendrait « URL synthetique = phishing » au lieu de l'imitation."""
    marques = [m for m in F.MARQUES if m not in F.DOMAINES_ABLATION]
    lignes = []
    for m in marques:
        vs = _variantes(m)
        random.shuffle(vs)
        for d in vs[:par_marque]:
            if any(ord(c) > 127 for c in d) and random.random() < 0.5:
                try:  # moitie des homoglyphes unicode sous forme punycode, comme dans les vrais liens
                    d = d.encode("idna").decode("ascii")
                except UnicodeError:
                    pass
            chemin = random.choice(chemins_reels) if chemins_reels and random.random() < 0.85 else "/"
            sous = random.choice(["", "", "www.", "secure.", "login.", "account."])
            schema = random.choice(["https://", "https://", "http://"])
            lignes.append((schema + sous + d + chemin, 1, "", "synthetique"))
    log(f"  Typosquats : {len(lignes)} URL generees sur {len(marques)} marques "
        f"(marques de l'ablation exclues)")
    return lignes


# --------------------------------------------------------------------------
# Assemblage + diagnostic
# --------------------------------------------------------------------------

def diagnostic(lignes):
    log("\n" + "=" * 72 + "\nDIAGNOSTIC DU CORPUS\n" + "=" * 72)
    c = Counter((s, l) for _, l, _, s in lignes)
    log(f"{'source':<26} {'phishing':>10} {'legitime':>10}")
    for s in sorted({s for _, _, _, s in lignes}):
        log(f"{s:<26} {c[(s, 1)]:>10} {c[(s, 0)]:>10}")
    parts = {}
    for lab, nom in ((1, "phishing"), (0, "legitime")):
        sel = [x for x in lignes if x[1] == lab and x[3] != "synthetique"]
        if not sel:
            continue
        https = sum(u.lower().startswith("https") for u, *_ in sel) / len(sel)
        chemin = sum(a_un_chemin(u) for u, *_ in sel) / len(sel)
        parts[lab] = (https, chemin)
        dates = sorted(d for _, _, d, _ in sel if d)
        log(f"\n{nom} : {len(sel)} reelles | https {https:.0%} | avec chemin {chemin:.0%} | "
            f"datees {len(dates)} ({dates[0] if dates else '-'} -> {dates[-1] if dates else '-'})")
        trimestres = Counter(f"{d[:4]}-T{(int(d[5:7]) - 1) // 3 + 1}" for d in dates)
        if trimestres:
            maxi = max(trimestres.values())
            for t in sorted(trimestres):
                log(f"   {t}  {'#' * max(1, round(40 * trimestres[t] / maxi))} {trimestres[t]}")
    log("\nA verifier avant d'entrainer : les deux classes doivent couvrir les MEMES "
        "trimestres,\net la part https / avec chemin doit etre comparable entre elles.")
    if 0 in parts and 1 in parts:
        ecart_chemin = abs(parts[0][1] - parts[1][1])
        ecart_https = abs(parts[0][0] - parts[1][0])
        if ecart_chemin > 0.15:
            log(f"\n! ATTENTION : {ecart_chemin:.0%} d'ecart sur la part « avec chemin » entre les classes. "
                "Le modele risque\n  d'apprendre la forme de la collecte plutot que le phishing.")
        else:
            log(f"\nPart « avec chemin » comparable entre les classes (ecart {ecart_chemin:.0%}) : OK.")
        if ecart_https > 0.15:
            log(f"Ecart https de {ecart_https:.0%} : sans effet, le schema est retire de l'entree des modeles.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rapide", action="store_true", help="petite collecte pour tester la chaine")
    ap.add_argument("--tous-commits", action="store_true", help="tous les commits OpenPhish (sinon 1 par jour)")
    ap.add_argument("--max-openphish", type=int, default=None)
    ap.add_argument("--max-ealvaradob", type=int, default=60000, help="par classe")
    ap.add_argument("--nb-collectes-cc", type=int, default=3)
    ap.add_argument("--budget-cc", type=int, default=30,
                    help="minutes accordees a l'index Common Crawl (souvent sature)")
    ap.add_argument("--par-domaine", type=int, default=120, help="URL legitimes par domaine et collecte")
    ap.add_argument("--nb-intl", type=int, default=120, help="domaines internationaux (Tranco)")
    ap.add_argument("--typos-par-marque", type=int, default=60)
    ap.add_argument("--accueils-instantanes", type=int, default=8, help="listes Tranco historiques")
    ap.add_argument("--accueils-par-instantane", type=int, default=8000)
    ap.add_argument("--accueils-rang-max", type=int, default=200000)
    args = ap.parse_args()

    if args.rapide:
        args.max_openphish = args.max_openphish or 15000
        args.max_ealvaradob = min(args.max_ealvaradob, 10000)
        args.nb_collectes_cc, args.par_domaine, args.nb_intl = 2, 40, 15
        args.budget_cc = 3
        args.typos_par_marque = 20
        args.accueils_instantanes, args.accueils_par_instantane = 3, 2000

    DATA.mkdir(exist_ok=True)
    t0 = time.time()

    log("\n[1/4] Phishing horodate : OpenPhish")
    phish = collecter_openphish(args.tous_commits, args.max_openphish)

    log("\n[2/4] Corpus historique : ealvaradob/phishing-dataset")
    histo = collecter_ealvaradob(args.max_ealvaradob)

    debut = min((d for _, _, d, _ in phish if d), default="2024-10-01")
    log(f"\n[3/4] Legitime horodate a partir du {debut} : Common Crawl / sitemaps")
    collectes = collectes_cc(debut, args.nb_collectes_cc)
    log(f"  collectes retenues : {', '.join(c['id'] for c in collectes) or 'aucune (index injoignable)'}")
    domaines_fr = DOMAINES_FR if not args.rapide else DOMAINES_FR[:20]
    leg_fr = collecter_legitimes(domaines_fr, collectes, args.par_domaine, "fr",
                                 budget_cc_min=max(1, args.budget_cc * 2 // 3))
    leg_intl = collecter_legitimes(domaines_tranco(args.nb_intl), collectes[-2:] or collectes,
                                   max(20, args.par_domaine // 2), "intl",
                                   budget_cc_min=max(1, args.budget_cc // 3))
    log("  Pages d'accueil legitimes datees (listes Tranco historiques)...")
    accueils = collecter_accueils(debut, args.accueils_instantanes, args.accueils_par_instantane,
                                  args.accueils_rang_max)

    log("\n[4/4] Typosquats synthetiques")
    # Chemins tires des phishing les plus anciens seulement (70 % premiers) : le test,
    # qui portera sur la periode recente, ne doit rien preter au generateur.
    dates = sorted(d for _, _, d, _ in phish if d)
    coupure = dates[int(len(dates) * 0.7)] if dates else "9999"
    chemins = []
    for u, _, d, _ in phish:
        if d and d < coupure:
            reste = F.retirer_schema(u)
            _, sep, apres = reste.partition("/")
            if sep and apres:
                chemins.append("/" + apres)
    typos = generer_typosquats(chemins, args.typos_par_marque)

    # Assemblage, dedoublonnage, exclusion des domaines d'ablation, conflits d'etiquettes.
    tout = phish + histo + leg_fr + leg_intl + accueils + typos
    par_url = {}
    conflits = set()
    for u, lab, d, s in tout:
        if not u or len(u) > 2000:
            continue
        if F.domaine_enregistre(u) in F.DOMAINES_ABLATION:
            continue
        if u in par_url and par_url[u][0] != lab:
            conflits.add(u)
            continue
        if u not in par_url or (d and (not par_url[u][1] or d < par_url[u][1])):
            par_url[u] = (lab, d, s)
    for u in conflits:
        par_url.pop(u, None)
    lignes = [(u, lab, d, s) for u, (lab, d, s) in par_url.items()]
    random.shuffle(lignes)

    with open(DATA / "corpus.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "label", "first_seen", "source", "synthetique"])
        for u, lab, d, s in lignes:
            w.writerow([u, lab, d, s, int(s == "synthetique")])

    diagnostic(lignes)
    log(f"\n{len(lignes)} URL ecrites dans data/corpus.csv "
        f"({len(conflits)} retirees pour etiquettes contradictoires) en {(time.time() - t0) / 60:.1f} min.")
    log("Etape suivante : python train.py")


if __name__ == "__main__":
    sys.exit(main())
