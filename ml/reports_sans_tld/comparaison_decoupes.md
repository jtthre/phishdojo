### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 342 / 11 380 | 0,9864 | 91,4 % [90,9 % – 91,8 %] |
| Temporelle, domaines nouveaux | 28 128 / 16 566 | 0,9736 | 71,2 % [69,6 % – 74,7 %] |

La decoupe aleatoire surestime le rappel de **20,2 points** (IC 95 % bootstrap : 16,7 a 21,7 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.
