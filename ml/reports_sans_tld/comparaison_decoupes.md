### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 40 709 / 23 752 | 0,9809 | 85,1 % [84,3 % – 86,7 %] |
| Temporelle, domaines nouveaux | 28 128 / 31 305 | 0,9676 | 69,2 % [67,4 % – 69,7 %] |

La decoupe aleatoire surestime le rappel de **15,9 points** (IC 95 % bootstrap : 15,0 a 18,2 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.
