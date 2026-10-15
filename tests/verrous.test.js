/* Verrous Python de ml/ : requirements.in liste les dépendances directes, requirements.txt les fige
 * toutes (indirectes comprises) avec leurs empreintes. Une mise à jour du .in sans régénération du
 * verrou (PR Dependabot partielle, édition à la main) doit faire échouer la CI. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const RACINE = path.join(__dirname, "..");
const DOSSIERS = ["ml", "ml/space"];
const norm = (nom) => nom.toLowerCase().replace(/[-_.]+/g, "-");

function directes(fichier) {
  const res = {};
  for (const brute of fs.readFileSync(fichier, "utf8").split(/\r?\n/)) {
    const ligne = brute.replace(/#.*/, "").trim();
    if (!ligne) continue;
    const m = /^([A-Za-z0-9._-]+)\s*==\s*([^\s;]+)$/.exec(ligne);
    assert.ok(m, path.relative(RACINE, fichier) + " : dépendance non figée en == : " + ligne);
    res[norm(m[1])] = m[2];
  }
  return res;
}

// Une ligne utile du verrou n'est que « nom==version [; marqueur] \ » ou « --hash=sha256:<64 hex> [\] » :
// tout le reste (autre index, --find-links, URL directe, -e, paquet sans version figée) est refusé.
const LIGNE_PAQUET = /^([A-Za-z0-9._-]+)==([^\s;\\]+)(\s*;\s*[^\\]+?)?\s*\\$/;
const LIGNE_EMPREINTE = /^\s+--hash=sha256:[0-9a-f]{64}(\s*\\)?$/;

// Un même paquet peut apparaître plusieurs fois, avec des marqueurs différents (version de Python…).
function verrou(fichier) {
  const res = {};
  let courant = null;
  for (const ligne of fs.readFileSync(fichier, "utf8").split(/\r?\n/)) {
    if (!ligne.trim() || ligne.trim().startsWith("#")) continue;
    const m = LIGNE_PAQUET.exec(ligne);
    if (m) {
      courant = { version: m[2], marqueur: (m[3] || "").trim(), empreintes: 0 };
      (res[norm(m[1])] = res[norm(m[1])] || []).push(courant);
    } else if (courant && LIGNE_EMPREINTE.test(ligne)) {
      courant.empreintes++;
    } else {
      assert.fail(path.relative(RACINE, fichier) + " : ligne inattendue dans le verrou : " + ligne.trim().slice(0, 80));
    }
  }
  return res;
}

for (const dossier of DOSSIERS) {
  test(dossier + " : le verrou suit requirements.in et fige tout avec empreintes", () => {
    const d = directes(path.join(RACINE, dossier, "requirements.in"));
    const v = verrou(path.join(RACINE, dossier, "requirements.txt"));
    assert.ok(Object.keys(d).length > 0, "requirements.in vide");
    for (const [nom, version] of Object.entries(d)) {
      assert.ok(v[nom], dossier + "/requirements.txt ne contient pas " + nom + " : régénérer le verrou");
      for (const variante of v[nom]) {
        assert.equal(variante.version, version,
          nom + " : " + version + " dans requirements.in, " + variante.version + " dans le verrou : régénérer");
      }
    }
    for (const [nom, variantes] of Object.entries(v)) {
      for (const variante of variantes) {
        assert.ok(variante.empreintes > 0, nom + " n'a aucune empreinte sha256 dans le verrou");
      }
    }
  });
}
