// Regenere docs/RELECTURE_WOLOF.md a partir de web/i18n.js et web/situations.js, en conservant
// les colonnes « Wolof » corrigees et « Relu » deja remplies par les relecteurs.
// Usage : node scripts/relecture-wolof.js          (ecrit le fichier)
//         node scripts/relecture-wolof.js --verifier (echoue si le fichier n'est pas a jour)
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RACINE = path.join(__dirname, "..");
const SORTIE = path.join(RACINE, "docs", "RELECTURE_WOLOF.md");

function charger(fichier) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RACINE, "web", fichier), "utf8"), ctx);
  return ctx.window;
}

function lignes() {
  const { fr, wo } = charger("i18n.js").PDS_I18N;
  const sit = charger("situations.js").PDS_SITUATIONS;
  const out = [];
  for (const k of Object.keys(fr)) {
    if (k === "lang") continue;
    const a = fr[k], b = wo[k];
    if (typeof a === "string") out.push([k, a, b]);
    else if (Array.isArray(a)) a.forEach((x, i) => out.push([`${k}[${i}]`, x, b[i]]));
    else for (const kk of Object.keys(a)) if (kk) out.push([`${k}.${kk}`, a[kk], b[kk]]);
  }
  for (const s of sit) {
    out.push([`situation.${s.id}.methode`, s.methode.fr, s.methode.wo]);
    out.push([`situation.${s.id}.scene`, s.scene.fr, s.scene.wo]);
    s.choix.forEach((c, i) => out.push([`situation.${s.id}.choix[${i}]`, c.fr, c.wo]));
    out.push([`situation.${s.id}.pourquoi`, s.pourquoi.fr, s.pourquoi.wo]);
  }
  return out;
}

// Cellule de tableau Markdown : la barre oblique inverse d'abord, sinon « \| » dans un texte
// deviendrait « \\| » et casserait la colonne (alerte CodeQL js/incomplete-sanitization).
const esc = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function relusExistants() {
  const relu = {};
  if (!fs.existsSync(SORTIE)) return relu;
  for (const l of fs.readFileSync(SORTIE, "utf8").split("\n")) {
    const m = /^\| `([^`]+)` \|.*\| ([^|]*) \|$/.exec(l);
    if (m && m[2].trim()) relu[m[1]] = m[2].trim();
  }
  return relu;
}

function generer() {
  const relu = relusExistants();
  const corps = lignes().map(([k, f, w]) => `| \`${k}\` | ${esc(f)} | ${esc(w)} | ${relu[k] || ""} |`);
  const restant = corps.filter((l) => /\|  \|$/.test(l)).length;
  return `# Relecture du wolof

Les textes wolof de l'interface et des situations sont une première version. **Ils doivent être relus par au moins deux locuteurs natifs avant l'ouverture de la collecte au public** (docs/AVANT_OUVERTURE.md).

Pour chaque ligne : corriger le wolof directement dans \`web/i18n.js\` ou \`web/situations.js\`, puis écrire « OK » (ou les initiales des relecteurs) dans la colonne « Relu ». Ce fichier se régénère avec \`node scripts/relecture-wolof.js\` sans perdre la colonne « Relu ».

Points d'attention :

- rester simple et oral : la page vise tout le monde, pas seulement les personnes à l'aise à l'écrit ;
- garder en français les mots que tout le monde emploie déjà ainsi (SMS, WhatsApp, QR code, Wave, Orange Money) ;
- vérifier que le sens de la case de consentement et des bons réflexes est exactement le même qu'en français.

Lignes restant à relire : **${restant} sur ${corps.length}**.

| Clé | Français | Wolof (proposition) | Relu |
| --- | --- | --- | --- |
${corps.join("\n")}
`;
}

const contenu = generer();
if (process.argv.includes("--verifier")) {
  const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, "utf8") : "";
  if (actuel !== contenu) {
    console.error("docs/RELECTURE_WOLOF.md n'est pas a jour : lancer node scripts/relecture-wolof.js");
    process.exit(1);
  }
  console.log("docs/RELECTURE_WOLOF.md a jour.");
} else {
  fs.writeFileSync(SORTIE, contenu);
  console.log("docs/RELECTURE_WOLOF.md regenere.");
}
module.exports = { lignes };
