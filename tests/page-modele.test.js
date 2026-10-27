/* Page « Le modèle » : les chiffres affichés viennent des rapports et du modèle actuels.
 * Chaque nombre marqué data-mesure est recalculé depuis ml/reports/metriques.json,
 * ml/reports/parite_web.md ou tests/parite/reference.json ; chaque score marqué data-score est
 * recalculé par le moteur du site. Après un réentraînement, ce test échoue tant que la page
 * annonce les anciens chiffres. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RACINE = path.join(__dirname, "..");
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), "utf8");

const HTML = lire("web", "modele.html");
const MET = JSON.parse(lire("ml", "reports", "metriques.json"));
const PARITE = lire("ml", "reports", "parite_web.md");
const REF = JSON.parse(lire("tests", "parite", "reference.json"));

// moteur du site, chargé comme dans parite.test.js (le modèle est lu comme une donnée)
const D = JSON.parse(/^\/\*[^*]*\*\/\r?\nwindow\.PDS_MODELE_URL=(\{.*\});\r?\n$/s.exec(lire("web", "modele", "url-lgbm.js"))[1]);
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(lire("web", "i18n.js"), ctx);
vm.runInContext(lire("web", "moteur-url.js"), ctx);
const M = ctx.window.PDS_MOTEUR_URL.creer(D);

const virgule = (x, n) => x.toFixed(n).replace(".", ",");
const pct = (x, n) => virgule(100 * x, n) + " %";
const entier = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const environ = (n) => "≈ " + entier(Math.round(n / 10) * 10);
const normaliser = (s) => s.replace(/&nbsp;/g, " ").replace(/[  ]/g, " ").trim();

function nombreDuRapport(motif) {
  const m = motif.exec(PARITE);
  assert.ok(m, "ml/reports/parite_web.md : ligne introuvable " + motif);
  return Number(m[1].replace(/[\s  ]/g, ""));
}

const S = Object.fromEntries(MET.lgbm.eval.seuils.map((s) => [Math.round(s.cible * 100), s]));
const DEC = MET.decoupe;
const CMP = MET.comparaison_decoupes;
const MESURES = {
  "retires": entier(DEC.phishing_test_retires_domaine_connu),
  "train-phishing": entier(DEC.train.phishing),
  "train-legitime": entier(DEC.train.legitime),
  "test-phishing": entier(DEC.test.phishing),
  "test-legitime": entier(DEC.test.legitime),
  "aleatoire": pct(CMP.aleatoire["rappel_a_0.1pct_fp"], 1),
  "temporelle": pct(CMP.temporelle["rappel_a_0.1pct_fp"], 1),
  "ecart": virgule(100 * (CMP.aleatoire["rappel_a_0.1pct_fp"] - CMP.temporelle["rappel_a_0.1pct_fp"]), 1),
  "auc": virgule(MET.lgbm.eval.auc, 3),
  // sur 100 phishing par jour (1 sur 1 000 de 100 000 adresses) : repérés, et fausses alertes parmi les 99 900 autres
  "vrais-80": String(Math.round(S[80].rappel * 100)),
  "faux-80": String(Math.round(S[80].tfp * 99900 / 10) * 10),
  "arbres": String(REF.nb_arbres),
  "parite-cas": entier(REF.cas.length),
  "parite-urls": entier(nombreDuRapport(/\| URL comparées \| ([\d\s  ]+) \(/)),
  "parite-differences": String(nombreDuRapport(/\| Verdicts différents \| (\d+) \|/)),
};
for (const c of [80, 90, 95]) {
  MESURES["rappel-" + c] = pct(S[c].rappel, 1);
  MESURES["tfp-" + c] = pct(S[c].tfp, 2);
  MESURES["ic-" + c] = "[" + virgule(100 * S[c].tfp_bas, 2) + " – " + virgule(100 * S[c].tfp_haut, 2) + "]";
  MESURES["alertes-" + c] = environ(S[c].alertes_jour);
}

// adresses gardées ici plutôt que dans la page, qui n'en affiche que la forme neutralisée
const SCORES = {
  "impots": "www.impots.gouv.fr/portail/particulier",
  "googie": "https://googIe.com/",
  "googie-connexion": "accounts.googIe.com/signin/v2/identifier",
  "lemonde-www": "https://www.lemonde.fr/",
  "wikipedla": "wikipedla.org",
  "github": "github.com/login",
  "letsdefend": "app.letsdefend.io/login",
};

const marques = [...HTML.matchAll(/<\w+[^>]*\sdata-(mesure|score)="([^"]+)"[^>]*>([^<]*)</g)]
  .map((m) => ({ type: m[1], cle: m[2], texte: normaliser(m[3]) }));

test("la page marque ses chiffres, et chaque marque est connue du test", () => {
  assert.ok(marques.filter((m) => m.type === "mesure").length >= 25);
  assert.ok(marques.filter((m) => m.type === "score").length >= 7);
  for (const m of marques) {
    assert.ok((m.type === "mesure" ? MESURES : SCORES)[m.cle] !== undefined, `data-${m.type}="${m.cle}" inconnu du test`);
  }
});

test("les chiffres de la page sont ceux de ml/reports/ et du jeu de référence", () => {
  for (const m of marques.filter((x) => x.type === "mesure")) {
    assert.equal(m.texte, MESURES[m.cle], `data-mesure="${m.cle}"`);
  }
});

test("les scores cités sont ceux que calcule le moteur du site", () => {
  for (const m of marques.filter((x) => x.type === "score")) {
    assert.equal(m.texte, virgule(M.analyser(SCORES[m.cle]).proba, 2), `data-score="${m.cle}" (${SCORES[m.cle]})`);
  }
});

test("le rapport de parité porte sur le modèle publié", () => {
  const sha = /^([0-9a-f]{64}) \*lgbm\.joblib$/m.exec(lire("ml", "models", "SHA256SUMS"))[1];
  const m = /sha256 `([0-9a-f]{8,})…`/.exec(PARITE);
  assert.ok(m && sha.startsWith(m[1]), "ml/reports/parite_web.md est périmé : relancer « cd ml && python parite_web.py »");
});

test("aucune adresse d'imitation n'est écrite en clair dans la page", () => {
  for (const faux of ["googIe.com", "wikipedla.org"]) assert.ok(!HTML.includes(faux), faux + " doit être neutralisé ([.])");
});
