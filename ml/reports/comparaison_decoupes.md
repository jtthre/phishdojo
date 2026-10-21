### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 342 / 11 380 | 0,9921 | 92,7 % [92,2 % – 93,1 %] |
| Temporelle, domaines nouveaux | 28 128 / 16 566 | 0,9730 | 45,1 % [44,6 % – 45,8 %] |

La decoupe aleatoire surestime le rappel de **47,5 points** (IC 95 % bootstrap : 46,6 a 48,2 points ; ce rappel se joue sur une quinzaine de legitimes en tete de classement, d'ou la largeur de l'intervalle) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.
