// Parité Python <-> navigateur sur un corpus entier (lancé par ml/parite_web.py).
// Entrée : les fichiers écrits par Python dans un dossier temporaire (URL, attributs float32,
// score brut, probabilité). Sortie : un résumé JSON sur stdout, sans aucune URL (le corpus
// contient de vraies URL de phishing et n'est jamais versionné).
// Usage : node scripts/parite-corpus.js <préfixe des fichiers>
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RACINE = path.join(__dirname, "..");
const base = process.argv[2];
if (!base) {
  console.error("usage : node scripts/parite-corpus.js <préfixe>");
  process.exit(2);
}

// le modèle est lu comme du JSON, jamais exécuté (même règle que tests/parite.test.js)
const texte = fs.readFileSync(path.join(RACINE, "web", "modele", "url-lgbm.js"), "utf8");
const D = JSON.parse(texte.slice(texte.indexOf("=") + 1, texte.lastIndexOf(";")));
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RACINE, "web", "moteur-url.js"), "utf8"), ctx);
const M = ctx.window.PDS_MOTEUR_URL.creer(D);

const lire = (ext, Type) => { const b = fs.readFileSync(base + ext); return new Type(b.buffer, b.byteOffset, b.length / Type.BYTES_PER_ELEMENT); };
const urls = JSON.parse(fs.readFileSync(base + ".urls.json", "utf8"));
const X = lire(".x", Float32Array);
const B = lire(".brut", Float64Array);
const P = lire(".p", Float64Array);
const nb = D.attributs.length;

const parAttribut = {};
let ecartsAttributs = 0, ecartsBrut = 0, ecartsVerdict = 0, maxBrut = 0, maxProba = 0, ms = 0;
for (let i = 0; i < urls.length; i++) {
  const t = process.hrtime.bigint();
  const x = M.vecteur(urls[i]);
  const brut = M.brut(x);
  const p = M.calibrer(brut);
  ms += Number(process.hrtime.bigint() - t) / 1e6;
  let ok = true;
  for (let k = 0; k < nb; k++) {
    if (x[k] !== X[i * nb + k]) { ok = false; parAttribut[D.attributs[k]] = (parAttribut[D.attributs[k]] || 0) + 1; }
  }
  if (!ok) ecartsAttributs++;
  if (brut !== B[i]) { ecartsBrut++; maxBrut = Math.max(maxBrut, Math.abs(brut - B[i])); }
  maxProba = Math.max(maxProba, Math.abs(p - P[i]));
  if (M.niveau(p) !== M.niveau(P[i])) ecartsVerdict++;
}

console.log(JSON.stringify({
  urls: urls.length, ecarts_attributs: ecartsAttributs, par_attribut: parAttribut,
  ecarts_score_brut: ecartsBrut, max_ecart_brut: maxBrut, max_ecart_proba: maxProba,
  ecarts_verdict: ecartsVerdict, ms_par_url: ms / urls.length, node: process.version
}));
