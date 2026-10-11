/* Porte de sortie V1 : zero fuite sur 100 messages fictifs.
 * Lancer : node --test tests/
 *
 * Bloquant (doit etre a zero) : numeros, montants, references, codes, e-mails, noms connus,
 * noms precedes d'un marqueur (« de », « M. », « Madame »...).
 * Mesure seulement : noms inconnus sans marqueur. C'est la limite assumee du masquage
 * automatique, couverte par le masquage manuel dans la page et la relecture avant publication.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const M = require(path.join(__dirname, "..", "web", "masquage.js"));
const { creerCorpus } = require("./corpus_fictif.js");

const corpus = creerCorpus(100);
const resultats = corpus.map((m) => ({ ...m, sortie: M.masquer(m.texte).texte }));
const seulementChiffres = (s) => s.replace(/\D/g, "");

function fuites(categorie, verifier) {
  const liste = [];
  for (const r of resultats) {
    for (const valeur of r.pii[categorie] || []) {
      if (verifier(valeur, r.sortie)) liste.push({ valeur, sortie: r.sortie });
    }
  }
  return liste;
}
const contientMot = (mot, texte) => new RegExp(`(^|[^\\p{L}])${mot}([^\\p{L}]|$)`, "iu").test(texte);

test("le corpus contient 100 messages", () => assert.equal(corpus.length, 100));

test("aucun numero de telephone ne fuit", () => {
  const f = fuites("tel", (t, s) => seulementChiffres(s).includes(t.chiffres.slice(-7)));
  assert.deepEqual(f, []);
});

test("aucun montant ne fuit", () => {
  const f = fuites("montant", (m, s) => s.includes(m.brut) || seulementChiffres(s).includes(m.chiffres));
  assert.deepEqual(f, []);
});

test("aucune reference de transaction ne fuit", () => {
  const f = fuites("ref", (ref, s) => s.includes(ref) || s.includes(ref.replace(/[^A-Z0-9]/g, "")));
  assert.deepEqual(f, []);
});

test("aucun code ne fuit", () => {
  const f = fuites("code", (c, s) => contientMot(c, s));
  assert.deepEqual(f, []);
});

test("aucune adresse e-mail ne fuit", () => {
  const f = fuites("email", (e, s) => s.includes(e) || s.includes("@"));
  assert.deepEqual(f, []);
});

test("aucun nom connu ne fuit", () => {
  const f = fuites("nom", (n, s) => contientMot(n, s));
  assert.deepEqual(f, []);
});

test("aucun nom precede d'un marqueur ne fuit", () => {
  const f = fuites("nom_marqueur", (n, s) => contientMot(n, s));
  assert.deepEqual(f, []);
});

test("mesure : noms inconnus sans marqueur (non bloquant)", (t) => {
  const total = resultats.reduce((a, r) => a + (r.pii.nom_libre || []).length, 0);
  const f = fuites("nom_libre", (n, s) => contientMot(n, s));
  t.diagnostic(`noms libres non masques automatiquement : ${f.length}/${total}`);
});

test("le masquage est idempotent", () => {
  for (const r of resultats) assert.equal(M.masquer(r.sortie).texte, r.sortie);
});

test("les domaines des liens sont conserves pour l'analyse", () => {
  const r = M.masquer("Suivez https://suivi-colis.top/c/AB12CD34?tel=771234567 ou www.exemple.sn");
  assert.deepEqual(r.domaines.sort(), ["exemple.sn", "suivi-colis.top"]);
  assert.ok(!/771234567/.test(r.texte));
});

test("les dates et les annees restent lisibles", () => {
  const r = M.masquer("Recu le 05/10/2026 a 14:32, campagne de 2026.");
  assert.match(r.texte, /05\/10\/2026/);
  assert.match(r.texte, /2026\./);
});

test("normalisation du numero d'expediteur", () => {
  assert.equal(M.normaliserNumero("77 123 45 67"), "221771234567");
  assert.equal(M.normaliserNumero("+221 77-123-45-67"), "221771234567");
  assert.equal(M.normaliserNumero("00221771234567"), "221771234567");
  assert.equal(M.normaliserNumero("123"), "");
});

test("contournements : chiffres pleine chasse et caracteres invisibles", () => {
  const pleineChasse = M.masquer("Appelez le ７７ １２３ ４５ ６７ vite").texte;
  assert.ok(!/[0-9０-９]{2}/.test(pleineChasse.replace("[NUMÉRO]", "")), pleineChasse);
  const invisible = M.masquer("Numero 77\u200b123\u200c45\u206067 et code 4\u00ad8\u200d2913").texte;
  assert.ok(!/\d{3}/.test(invisible), invisible);
  const tiret = M.masquer("Mon numero : 77-123-45-67.").texte;
  assert.match(tiret, /\[NUMÉRO\]/);
});
