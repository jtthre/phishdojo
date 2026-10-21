/* Parité Python <-> navigateur du vérificateur de liens (phase B).
 * Le moteur web/moteur-url.js doit retrouver, pour chaque URL du jeu de référence, exactement
 * ce que calcule Python : découpage, 31 attributs (float32), score brut, probabilité calibrée,
 * contributions SHAP. Le jeu et le modèle exporté sont produits par ml/exporter_web.py ;
 * ml/parite_web.py refait la vérification sur le corpus complet (ml/reports/parite_web.md). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RACINE = path.join(__dirname, "..");
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), "utf8");
const REEXPORTER = " : relancer « cd ml && python exporter_web.py » et committer web/modele/ et tests/parite/";

// Règle 11 : le fichier du modèle n'est jamais exécuté ici. On vérifie qu'il n'est qu'une
// affectation de JSON, puis on lit ce JSON (le premier test échoue si le format change).
const texteModele = lire("web", "modele", "url-lgbm.js");
const FORMAT_MODELE = /^\/\*[^*]*\*\/\r?\nwindow\.PDS_MODELE_URL=(\{.*\});\r?\n$/s;
const affectation = FORMAT_MODELE.exec(texteModele);
const D = affectation ? JSON.parse(affectation[1]) : null;
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(lire("web", "i18n.js"), ctx);
vm.runInContext(lire("web", "moteur-url.js"), ctx);
const MU = ctx.window.PDS_MOTEUR_URL;
const M = D ? MU.creer(D) : null;
const REF = JSON.parse(lire("tests", "parite", "reference.json"));

function sha256Source(f) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(RACINE, f)).toString("binary").replace(/\r\n/g, "\n"), "binary").digest("hex");
}

test("le modèle exporté ne contient que des données (règle 11 : aucun code à exécuter)", () => {
  assert.ok(affectation, "le fichier doit être exactement « window.PDS_MODELE_URL=<JSON>; »");
  assert.equal(D.format, 1);
  // aucune clé qui pourrait toucher aux prototypes une fois les données utilisées
  assert.doesNotMatch(affectation[1], /"(__proto__|constructor|prototype)"\s*:/);
});

test("le modèle exporté vient du modèle entraîné et du code d'attributs actuels", () => {
  const sommes = lire("ml", "models", "SHA256SUMS");
  const attendu = /^([0-9a-f]{64}) \*lgbm\.joblib$/m.exec(sommes)[1];
  assert.equal(D.provenance.modele_sha256, attendu, "lgbm.joblib a changé" + REEXPORTER);
  assert.equal(D.provenance.features_sha256, sha256Source("ml/features.py"), "ml/features.py a changé" + REEXPORTER);
  assert.equal(D.provenance.modeles_sha256, sha256Source("ml/modeles.py"), "ml/modeles.py a changé" + REEXPORTER);
  assert.equal(REF.modele_sha256, attendu, "jeu de référence périmé" + REEXPORTER);
  // nombre d'arbres du booster, écrit par l'export dans le jeu de référence : les deux fichiers doivent concorder
  assert.equal(D.arbres.length, REF.nb_arbres, "nombre d'arbres différent du booster exporté" + REEXPORTER);
  assert.equal(D.attributs.length, 31);
});

test("jeu de référence : assez de cas, dont tous les cas limites écrits à la main", () => {
  assert.ok(REF.cas.length >= 2500, String(REF.cas.length));
  assert.ok(REF.cas.filter((c) => c.shap).length >= 400);
});

test("parité : découpage de l'URL (urllib, tldextract, ipaddress, idna)", () => {
  // Array.from : les tableaux créés dans le contexte vm n'ont pas le même prototype
  for (const c of REF.cas) assert.deepEqual(Array.from(M.decouper(c.url)), c.decoupe, JSON.stringify(c.url));
});

test("parité : les 31 attributs, au bit près en float32", () => {
  for (const c of REF.cas) {
    const x = M.vecteur(c.url);
    for (let k = 0; k < x.length; k++) assert.ok(x[k] === c.x[k], `${JSON.stringify(c.url)} : ${D.attributs[k]} ${x[k]} au lieu de ${c.x[k]}`);
  }
});

test("parité : score brut de tous les arbres au bit près, probabilité calibrée et verdict", () => {
  for (const c of REF.cas) {
    const brut = M.brut(c.x);
    assert.ok(brut === c.brut, `${JSON.stringify(c.url)} : brut ${brut} au lieu de ${c.brut}`);
    const p = M.calibrer(brut);
    assert.ok(Math.abs(p - c.proba) <= 1e-12, `${JSON.stringify(c.url)} : proba ${p} au lieu de ${c.proba}`);
    assert.equal(M.niveau(p), M.niveau(c.proba));
  }
});

test("parité : contributions SHAP (TreeSHAP de LightGBM)", () => {
  for (const c of REF.cas.filter((x) => x.shap)) {
    const phi = M.contributions(c.x);
    for (let k = 0; k < phi.length; k++) assert.ok(Math.abs(phi[k] - c.shap[k]) <= 1e-9, `${JSON.stringify(c.url)} : contribution ${k}`);
  }
});

test("exemples publiés dans ml/README.md : impots.gouv.fr légitime, googIe.com détecté", () => {
  const vrai = M.analyser("https://www.impots.gouv.fr/portail/particulier");
  const faux = M.analyser("accounts.googIe.com/signin/v2/identifier");
  assert.equal(vrai.niveau, 0);
  assert.equal(faux.niveau, 3);
  assert.equal(faux.attributs.squelette_marque, 1, "googIe s'écrit comme google une fois le I lu comme un l");
  assert.equal(faux.details.marqueProche, "google.com");
  assert.equal(faux.raisons.length, 31);
  for (let i = 1; i < faux.raisons.length; i++) assert.ok(Math.abs(faux.raisons[i - 1].contribution) >= Math.abs(faux.raisons[i].contribution));
});

test("liens d'un message : formes désamorcées, domaines nus, montants et noms ignorés", () => {
  const l = M.extraireLiens("Colis bloqué : hxxps://suivi-colis[.]top/payer ou bit.ly/3xYz, (www.exemple.fr). Montant 25.000F, M.Ba, contact@exemple.fr, 1.5");
  assert.deepEqual(Array.from(l), ["https://suivi-colis.top/payer", "bit.ly/3xYz", "www.exemple.fr"]);
  assert.equal(l.tronque, false);
  assert.deepEqual(Array.from(M.extraireLiens("exemple.com exemple.com http://a.example/ x.y")), ["exemple.com", "http://a.example/"]);
  const beaucoup = M.extraireLiens(Array.from({ length: 12 }, (_, i) => `http://site${i}.example/`).join(" "), 10);
  assert.equal(beaucoup.length, 10);
  assert.equal(beaucoup.tronque, true);
  assert.deepEqual(Array.from(M.extraireLiens("Bonjour, appelez le 77 000 00 00 svp.")), []);
});

test("affichage désamorcé : jamais d'adresse cliquable", () => {
  assert.equal(MU.desamorcer("https://faceb00k.com/login?a=b.c"), "hxxps://faceb00k[.]com/login?a=b.c");
  assert.equal(MU.desamorcer("bit.ly/3xYz"), "bit[.]ly/3xYz");
  assert.equal(MU.desamorcer("<script>.x"), "<script>[.]x", "le texte est inséré par createTextNode, jamais comme du HTML");
  // adresses glissées dans le chemin ou la requête
  assert.equal(MU.desamorcer("http://exemple.com/redirect?u=http://autre.example/x"), "hxxp://exemple[.]com/redirect?u=hxxp://autre[.]example/x");
  assert.equal(MU.desamorcer("https://a.example/?r=www.autre.example&x=1"), "hxxps://a[.]example/?r=www[.]autre[.]example&x=1");
  // leurres visuels : inversion du sens d'écriture, espace de largeur nulle, caractère d'étiquette
  const RLO = String.fromCharCode(0x202e), ZWSP = String.fromCharCode(0x200b), TAG = String.fromCharCode(0xdb40, 0xdc41);
  assert.equal(MU.desamorcer("https://paypal.com" + RLO + "/moc.example"), "hxxps://paypal[.]com‹U+202E›/moc.example");
  assert.equal(MU.desamorcer("pay" + ZWSP + "pal.com"), "pay‹U+200B›pal[.]com");
  assert.equal(MU.desamorcer("x.example/" + TAG), "x[.]example/‹U+E0041›");
});

test("chaque attribut du modèle a un libellé en français et en wolof", () => {
  const I = ctx.window.PDS_I18N;
  for (const lang of ["fr", "wo"]) assert.deepEqual(Object.keys(I[lang].attr).sort(), [...D.attributs].sort(), lang);
});
