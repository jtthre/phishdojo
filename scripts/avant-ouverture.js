// Lit docs/AVANT_OUVERTURE.md et dit ce qui reste a faire avant d'ouvrir la collecte au public.
// Utilise par le hook de demarrage des sessions Claude et par le deploiement (scripts/ecrire-config.js).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const FICHIER = path.join(__dirname, "..", "docs", "AVANT_OUVERTURE.md");

function etat(contenu) {
  const points = [];
  for (const ligne of String(contenu).split(/\r?\n/)) {
    const m = /^\s*[-*]\s+\[([ xX])\]\s+(?:\*\*)?(.+?)(?:\*\*)?(?:\s*:.*)?$/.exec(ligne);
    if (m) points.push({ fait: m[1].toLowerCase() === "x", titre: m[2].replace(/\*\*/g, "").trim() });
  }
  return { points, restants: points.filter((p) => !p.fait), complet: points.length > 0 && points.every((p) => p.fait) };
}

function lire() {
  try { return etat(fs.readFileSync(FICHIER, "utf8")); }
  catch (e) { return { points: [], restants: [], complet: false, erreur: "docs/AVANT_OUVERTURE.md introuvable" }; }
}

module.exports = { etat, lire };

if (require.main === module) {
  const e = lire();
  if (e.erreur) { console.log("RAPPEL : " + e.erreur + ". La collecte ne doit pas etre ouverte au public."); process.exit(0); }
  if (e.complet) { console.log("Checklist d'ouverture au public : complete."); process.exit(0); }
  console.log("RAPPEL A FAIRE A JUNIOR EN DEBUT DE SESSION - avant d'ouvrir la collecte au public, il reste :");
  e.restants.forEach((p, i) => console.log(`  ${i + 1}. ${p.titre}`));
  console.log("Detail : docs/AVANT_OUVERTURE.md. Tant que ces points restent ouverts, le site se deploie en mode demonstration.");
}
