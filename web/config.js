/* Configuration publique. Vide = mode demonstration (rien n'est envoye).
 * En production, le deploiement continu reecrit ce fichier (scripts/ecrire-config.js) a partir
 * des variables du depot. La base n'est branchee que si docs/AVANT_OUVERTURE.md est coche,
 * ou en MODE_TEST avec un bandeau « version de test ». */
window.PDS_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  modeTest: false
};
