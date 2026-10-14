"""
Les deux modeles entraines localement, et leur chargement pour app.py.

  - LightGBM sur les attributs de features.py : rapide, explicable (contributions SHAP).
  - CNN sur les octets de l'URL : lit chaque caractere, casse et unicode compris,
    la ou un tokenizer « uncased » comme celui du BERT de reference efface le « I » de googIe.

Les deux sont calibres (regression isotonique) a un a priori equilibre 50/50 :
la probabilite affichee repond a « sur un lot moitie phishing moitie legitime,
quelle part des URL qui ressemblent a celle-ci sont du phishing ? ».
ajuster_prior() la convertit au taux de base reel.
"""

import hashlib
from pathlib import Path

import numpy as np

import features as F

RACINE = Path(__file__).resolve().parent
DOSSIER_MODELES = RACINE / "models"
FICHIER_EMPREINTES = "SHA256SUMS"


# --------------------------------------------------------------------------
# Empreintes des modeles : ce sont des pickles, les charger execute du code
# --------------------------------------------------------------------------

def _sha256(chemin):
    h = hashlib.sha256()
    with open(chemin, "rb") as f:
        for bloc in iter(lambda: f.read(1 << 20), b""):
            h.update(bloc)
    return h.hexdigest()


def _lire_empreintes(dossier):
    sommes = {}
    fichier = Path(dossier) / FICHIER_EMPREINTES
    if fichier.exists():
        for ligne in fichier.read_text(encoding="ascii").splitlines():
            if ligne.strip():
                somme, nom = ligne.split(maxsplit=1)
                sommes[nom.lstrip("*")] = somme
    return sommes


def ecrire_empreinte(chemin):
    """Enregistre l'empreinte d'un modele qu'on vient d'ecrire, au format de sha256sum."""
    chemin = Path(chemin)
    sommes = _lire_empreintes(chemin.parent)
    sommes[chemin.name] = _sha256(chemin)
    lignes = "".join(f"{s} *{n}\n" for n, s in sorted(sommes.items()))
    (chemin.parent / FICHIER_EMPREINTES).write_text(lignes, encoding="ascii", newline="\n")


def verifier_empreinte(chemin):
    """Refuse d'ouvrir un modele dont l'empreinte n'est pas celle ecrite par train.py."""
    chemin = Path(chemin)
    attendue = _lire_empreintes(chemin.parent).get(chemin.name)
    if attendue is None:
        raise ValueError(f"{chemin.name} : aucune empreinte dans {FICHIER_EMPREINTES}, chargement refuse")
    if _sha256(chemin) != attendue:
        raise ValueError(f"{chemin.name} : empreinte differente de {FICHIER_EMPREINTES}, chargement refuse")
MAXLEN = 200


# --------------------------------------------------------------------------
# Outils communs
# --------------------------------------------------------------------------

def tld(url):
    hote = F.decouper(url)[0].lower().strip("[]")
    return hote.rsplit(".", 1)[-1] if "." in hote else ""


def construire_X(urls, vocab_tld):
    """Matrice d'attributs + code de TLD (0 = TLD rare ou inconnu)."""
    X = np.asarray(F.matrice(urls), dtype=np.float32)
    codes = np.asarray([vocab_tld.get(tld(u), 0) for u in urls], dtype=np.float32)[:, None]
    return np.hstack([X, codes])


NOMS_COLONNES = F.NOMS_ATTRIBUTS + ["tld"]


def _logit(s):
    s = np.clip(np.asarray(s, dtype=np.float64), 1e-7, 1 - 1e-7)
    return np.log(s / (1 - s))


class CalibrateurPlatt:
    """Calibration de Platt sur le logit du score brut, classes equilibrees.
    Deux parametres seulement : robuste meme avec quelques centaines de legitimes
    en validation, et jamais de 0 ou de 1 exacts — contrairement au modele de reference."""

    def fit(self, scores, y):
        from sklearn.linear_model import LogisticRegression
        self.lr = LogisticRegression(C=1.0, class_weight="balanced")
        self.lr.fit(_logit(scores)[:, None], np.asarray(y))
        return self

    def predict(self, scores):
        return self.lr.predict_proba(_logit(scores)[:, None])[:, 1]


def ajuster_prior(p, pi, pi_calib=0.5):
    """Probabilite calibree a l'a priori pi_calib -> probabilite au taux de base pi (Bayes)."""
    p = np.clip(np.asarray(p, dtype=np.float64), 1e-6, 1 - 1e-6)
    num = p * pi / pi_calib
    return num / (num + (1 - p) * (1 - pi) / (1 - pi_calib))


# --------------------------------------------------------------------------
# CNN sur caracteres
# --------------------------------------------------------------------------

def encoder(urls, maxlen=MAXLEN):
    """Octets UTF-8 de l'URL sans son schema, decales de 1 (0 = remplissage)."""
    out = np.zeros((len(urls), maxlen), dtype=np.int64)
    for i, u in enumerate(urls):
        b = F.retirer_schema(u).encode("utf-8", "ignore")[:maxlen]
        out[i, :len(b)] = np.frombuffer(b, dtype=np.uint8).astype(np.int64) + 1
    return out


def creer_cnn(emb=48, filtres=128, tailles=(3, 4, 5, 7), drop=0.3):
    import torch
    import torch.nn as nn

    class CharCNN(nn.Module):
        def __init__(self):
            super().__init__()
            self.emb = nn.Embedding(257, emb, padding_idx=0)
            self.convs = nn.ModuleList([nn.Conv1d(emb, filtres, k, padding=k // 2) for k in tailles])
            self.drop = nn.Dropout(drop)
            self.fc = nn.Linear(filtres * len(tailles), 128)
            self.out = nn.Linear(128, 1)

        def forward(self, x):
            masque = (x > 0).unsqueeze(1)                     # ignorer le remplissage
            e = self.emb(x).transpose(1, 2)
            h = []
            for c in self.convs:
                z = torch.relu(c(e))[:, :, : x.shape[1]]
                z = z.masked_fill(~masque, 0.0)
                h.append(z.amax(dim=2))
            h = self.drop(torch.cat(h, dim=1))
            return self.out(self.drop(torch.relu(self.fc(h)))).squeeze(1)

    return CharCNN()


# --------------------------------------------------------------------------
# Predicteurs charges depuis models/
# --------------------------------------------------------------------------

class PredicteurLGBM:
    nom = "local : LightGBM (attributs)"

    def __init__(self, chemin=DOSSIER_MODELES / "lgbm.joblib"):
        import joblib
        verifier_empreinte(chemin)
        b = joblib.load(chemin)
        self.booster, self.calib, self.vocab = b["booster"], b["calib"], b["vocab_tld"]
        self.seuils = b.get("seuils", {})

    def proba(self, urls):
        X = construire_X(urls, self.vocab)
        return self.calib.predict(self.booster.predict(X))

    def expliquer(self, url, k=3):
        """Les k attributs qui ont le plus pousse la decision, en clair."""
        X = construire_X([url], self.vocab)
        contrib = self.booster.predict(X, pred_contrib=True)[0][:-1]  # dernier = biais
        valeurs = X[0]
        ordre = np.argsort(-np.abs(contrib))[:k]
        lignes = []
        for i in ordre:
            nom = NOMS_COLONNES[i]
            libelle = F.LIBELLES.get(nom, "extension du domaine (TLD)")
            sens = "vers phishing" if contrib[i] > 0 else "vers legitime"
            if nom == "tld":
                v = tld(url) or "-"
            else:
                v = valeurs[i]
                v = int(v) if float(v).is_integer() else round(float(v), 2)
            lignes.append((libelle, v, float(contrib[i]), sens))
        return lignes


class PredicteurCNN:
    nom = "local : CNN caracteres"

    def __init__(self, chemin=DOSSIER_MODELES / "charcnn.pt"):
        import joblib
        import torch
        self.torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        verifier_empreinte(chemin)
        etat = torch.load(chemin, map_location=self.device, weights_only=True)
        self.modele = creer_cnn().to(self.device)
        self.modele.load_state_dict(etat)
        self.modele.eval()
        verifier_empreinte(Path(chemin).parent / "charcnn_calib.joblib")
        extra = joblib.load(Path(chemin).parent / "charcnn_calib.joblib")
        self.calib, self.seuils = extra["calib"], extra.get("seuils", {})

    def brut(self, urls, lot=1024):
        torch = self.torch
        sorties = []
        with torch.no_grad():
            for i in range(0, len(urls), lot):
                x = torch.from_numpy(encoder(urls[i:i + lot])).to(self.device)
                sorties.append(torch.sigmoid(self.modele(x)).float().cpu().numpy())
        return np.concatenate(sorties) if sorties else np.zeros(0)

    def proba(self, urls):
        return self.calib.predict(self.brut(urls))


def predicteurs_locaux():
    """Les modeles entraines presents dans models/, prets a l'emploi."""
    out = {}
    if (DOSSIER_MODELES / "lgbm.joblib").exists():
        try:
            p = PredicteurLGBM()
            out[p.nom] = p
        except Exception as e:  # noqa: BLE001
            print(f"LightGBM local non charge : {e}")
    if (DOSSIER_MODELES / "charcnn.pt").exists():
        try:
            p = PredicteurCNN()
            out[p.nom] = p
        except Exception as e:  # noqa: BLE001
            print(f"CNN local non charge : {e}")
    return out
