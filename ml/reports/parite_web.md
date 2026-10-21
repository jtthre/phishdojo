# Parité Python ↔ navigateur sur le corpus complet

Généré par `ml/parite_web.py` le 2026-10-21. Modèle `lgbm.joblib` (sha256 `df10938c2d5c…`), moteur `web/moteur-url.js`, Node v24.14.1.

Chaque URL du corpus passe par Python (`features.py`, LightGBM, calibration) puis par le moteur du site, et on compare les valeurs. Le jeu de référence versionné (`tests/parite/reference.json`) refait la même vérification à chaque push, contributions SHAP comprises.

| Mesure | Résultat |
| --- | --- |
| URL comparées | 409 211 (phishing 282 353, légitimes 126 858) |
| URL dont au moins un attribut diffère | 0 |
| Scores bruts différents (au bit près) | 0 |
| Écart maximal de probabilité calibrée | 4,4e-16 |
| Verdicts différents | 0 |
| Temps moyen par URL sur ce poste (attributs + 274 arbres, sans SHAP) | 0,38 ms |

**Parité totale.** Le seul écart restant vient de `exp` et `log` de la bibliothèque mathématique (dernier chiffre d'un nombre à 16 décimales) ; il ne change aucun verdict.
