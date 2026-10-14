### Decoupe aleatoire contre decoupe temporelle (meme population)

Meme LightGBM, memes URL (datees et reelles uniquement), memes tailles d'entrainement. Seule la maniere de tirer le test change.

| Decoupe | Test (phishing / legitimes) | AUC ROC | Rappel a 0,1 % de FP |
| --- | --- | --- | --- |
| Aleatoire (ce que fait la plupart des projets) | 38 342 / 11 380 | 0,9921 | 92,5 % |
| Temporelle, domaines nouveaux | 28 128 / 16 566 | 0,9750 | 54,0 % |

La decoupe aleatoire surestime le rappel de **38,5 points** : des URL de la meme campagne se retrouvent des deux cotes de la frontiere, et le modele est note sur des campagnes qu'il a deja vues.
