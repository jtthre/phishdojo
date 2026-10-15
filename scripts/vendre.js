// Copie dans web/vendor/ les polices et le moteur OCR installes par npm.
//
// Pourquoi : le site ne charge plus rien depuis un domaine tiers (ni Google Fonts, ni CDN).
// La politique de securite du contenu peut donc se limiter a 'self', aucun tiers ne voit
// l'adresse IP des visiteurs, et l'integrite des fichiers est garantie par package-lock.json
// (empreintes sha512 verifiees par npm ci).
//
// Lance automatiquement apres npm install / npm ci (script postinstall).
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const RACINE = path.join(__dirname, "..");
const NM = path.join(RACINE, "node_modules");
const SORTIE = path.join(RACINE, "web", "vendor");

function copier(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function existe(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

if (!existe(path.join(NM, "tesseract.js"))) {
  console.log("vendre : dependances absentes, rien a copier (lancer npm install).");
  process.exit(0);
}

// Le worker de tesseract.js ne fonctionne qu'avec le coeur de la meme version majeure : on
// s'arrete ici plutot que de publier un OCR qui echoue en silence dans le navigateur.
const majeure = (v) => String(v).replace(/^[^\d]*/, "").split(".")[0];
const attendu = require(path.join(NM, "tesseract.js", "package.json")).dependencies["tesseract.js-core"];
const installe = require(path.join(NM, "tesseract.js-core", "package.json")).version;
if (majeure(attendu) !== majeure(installe)) {
  console.error("vendre : tesseract.js attend tesseract.js-core " + attendu + ", installe " + installe +
                ". Mettre les deux paquets a la meme version majeure dans package.json.");
  process.exit(1);
}

fs.rmSync(SORTIE, { recursive: true, force: true });

// ---------------------------------------------------------------- polices (latin + latin etendu)
const POLICES = [
  ["inter-tight", ["400", "500", "600"]],
  ["jetbrains-mono", ["400", "600"]],
  ["doto", ["500", "700"]]
];
let css = "/* Polices auto-hebergees (Fontsource, licence SIL OFL). Genere par scripts/vendre.js. */\n";
for (const [pkg, graisses] of POLICES) {
  for (const g of graisses) {
    const fichierCss = path.join(NM, "@fontsource", pkg, g + ".css");
    const blocs = fs.readFileSync(fichierCss, "utf8").split("/* ").slice(1);
    for (const bloc of blocs) {
      const nom = bloc.slice(0, bloc.indexOf(" */"));
      if (!/-latin-(ext-)?\d+-normal$/.test(nom)) continue;
      const woff2 = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(bloc)[1];
      copier(path.join(NM, "@fontsource", pkg, "files", woff2), path.join(SORTIE, "fonts", woff2));
      css += "/* " + bloc
        .replace(/src:[^;]+;/, "src: url(fonts/" + woff2 + ") format('woff2');")
        .trim() + "\n";
    }
  }
}
fs.writeFileSync(path.join(SORTIE, "fonts.css"), css);

// ---------------------------------------------------------------- OCR : Tesseract.js, coeur LSTM, francais
const T = path.join(NM, "tesseract.js", "dist");
copier(path.join(T, "tesseract.min.js"), path.join(SORTIE, "tesseract", "tesseract.min.js"));
copier(path.join(T, "worker.min.js"), path.join(SORTIE, "tesseract", "worker.min.js"));
// Mode LSTM seul : Tesseract.js charge l'une de ces variantes (WebAssembly embarque), selon
// que le navigateur gere SIMD, puis SIMD relache (processeurs recents, depuis la version 7).
for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  copier(path.join(NM, "tesseract.js-core", f), path.join(SORTIE, "tesseract", "core", f));
}
copier(path.join(NM, "@tesseract.js-data", "fra", "4.0.0_best_int", "fra.traineddata.gz"),
       path.join(SORTIE, "tesseract", "lang", "fra.traineddata.gz"));

// Licences des composants embarques
const LICENCES = [
  ["tesseract.js", "LICENSE.md"], ["tesseract.js-core", "LICENSE"],
  ["@fontsource/inter-tight", "LICENSE"], ["@fontsource/jetbrains-mono", "LICENSE"], ["@fontsource/doto", "LICENSE"]
];
for (const [pkg, f] of LICENCES) {
  const src = path.join(NM, pkg, f);
  if (existe(src)) copier(src, path.join(SORTIE, "licences", pkg.replace("/", "__") + ".txt"));
}

let total = 0;
(function taille(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) taille(p); else total += fs.statSync(p).size;
  }
})(SORTIE);
console.log("vendre : web/vendor pret (" + (total / 1048576).toFixed(1) + " Mo)");
