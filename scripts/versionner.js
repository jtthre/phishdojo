// Ajoute une empreinte de contenu aux ressources locales des pages (style.css?v=3f2a…), au déploiement.
//
// Pourquoi : GitHub Pages sert chaque fichier avec « Cache-Control: max-age=600 ». Après une mise à
// jour, un navigateur pouvait charger la nouvelle page avec l'ancienne feuille de style ou les anciens
// scripts restés en cache (page cassée, textes manquants). Avec l'empreinte, une page modifiée pointe
// vers des adresses nouvelles ; les fichiers inchangés gardent la leur et restent en cache.
//
// Lancé par le workflow de déploiement après scripts/ecrire-config.js (config.js change à chaque
// déploiement). Idempotent : une empreinte déjà présente est remplacée, jamais doublée.
//
// Limite assumée : les fichiers chargés plus tard par signaler.js (moteur OCR dans vendor/tesseract/) et
// les polices .woff2 n'ont pas d'empreinte. Ils viennent de npm, verrouillés, et ne changent qu'à une
// montée de version : au pire, dix minutes de mélange ancien/nouveau après une telle mise à jour.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const RACINE = process.env.VERSIONNER_RACINE || path.join(__dirname, "..", "web");
const REF = /(\s(?:href|src)=")([^"?#:]+\.(?:css|js|svg))(?:\?v=[0-9a-f]+)?(")/g;

function empreinte(fichier) {
  return crypto.createHash("sha256").update(fs.readFileSync(fichier)).digest("hex").slice(0, 12);
}

let total = 0;
for (const page of fs.readdirSync(RACINE).filter((n) => n.endsWith(".html"))) {
  const chemin = path.join(RACINE, page);
  const html = fs.readFileSync(chemin, "utf8");
  const nouveau = html.replace(REF, (tout, avant, ressource, apres) => {
    const fichier = path.join(RACINE, ressource);
    if (!fs.existsSync(fichier)) {
      console.error("versionner : " + page + " référence " + ressource + ", introuvable");
      process.exit(1);
    }
    total++;
    return avant + ressource + "?v=" + empreinte(fichier) + apres;
  });
  if (nouveau !== html) fs.writeFileSync(chemin, nouveau);
}
console.log("versionner : " + total + " références de ressources locales marquées d'une empreinte");
