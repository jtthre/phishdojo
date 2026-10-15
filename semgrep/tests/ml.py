# Cas de test des règles semgrep/regles/ml.yml (semgrep --test). Code fictif, jamais exécuté.
import pickle

import joblib
import numpy as np
import pandas as pd
import torch


def verifier_empreinte(chemin):
    pass


def charge_verifiee(chemin):
    verifier_empreinte(chemin)
    # ok: pds-pickle-sans-empreinte
    return joblib.load(chemin)


def charge_directe(chemin):
    # ruleid: pds-pickle-sans-empreinte
    return joblib.load(chemin)


def charge_autre_fichier(chemin, autre):
    verifier_empreinte(autre)
    # ruleid: pds-pickle-sans-empreinte
    return joblib.load(chemin)


def charge_pickle(donnees, fichier, chemin):
    # ruleid: pds-pickle-interdit
    a = pickle.loads(donnees)
    # ruleid: pds-pickle-interdit
    b = pd.read_pickle(chemin)
    # ruleid: pds-pickle-interdit
    c = np.load(chemin, allow_pickle=True)
    # ok: pds-pickle-interdit
    d = np.load(chemin)
    return a, b, c, d


def charge_cnn(chemin):
    verifier_empreinte(chemin)
    # ok: pds-pickle-sans-empreinte, pds-torch-load-sans-weights-only
    return torch.load(chemin, map_location="cpu", weights_only=True)


def charge_cnn_risquee(chemin):
    verifier_empreinte(chemin)
    # ruleid: pds-torch-load-sans-weights-only
    return torch.load(chemin, map_location="cpu")
