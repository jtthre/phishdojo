### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP [IC 95 % bootstrap] |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 40 709 / 23 752 | 0,9898 | 89,6 % [89,0 % – 90,4 %] |
| Temporelle, domaines nouveaux | 28 128 / 31 305 | 0,9762 | 54,8 % [54,2 % – 57,3 %] |

La decoupe aleatoire surestime le rappel de **34,7 points** (IC 95 % bootstrap : 32,4 a 35,8 points ; l'intervalle couvre le tirage du test, pas la variabilite de l'entrainement) : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.
