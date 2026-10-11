/* Garde-fou de deploiement : la base n'est branchee que si la checklist d'ouverture est complete,
 * ou en MODE_TEST (avec bandeau). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { etat } = require("../scripts/avant-ouverture.js");

const SCRIPT = path.join(__dirname, "..", "scripts", "ecrire-config.js");
const URL_OK = "https://abcdefghijklmnopqrst.supabase.co";
const CLE_OK = "cle-publique-de-test-0123456789";

function generer(env, dossier) {
  const tmp = dossier || fs.mkdtempSync(path.join(os.tmpdir(), "pds-"));
  const sortie = path.join(tmp, "config.js");
  execFileSync(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, CONFIG_SORTIE: sortie, CSP_RACINE: tmp, ...env }, stdio: "pipe" });
  const ctx = { window: {} };
  require("node:vm").runInNewContext(fs.readFileSync(sortie, "utf8"), ctx);
  return ctx.window.PDS_CONFIG;
}

test("la checklist se lit correctement", () => {
  const e = etat("- [x] **Un** : fait\n- [ ] **Deux** : pas fait\n* [X] Trois");
  assert.equal(e.points.length, 3);
  assert.deepEqual(e.restants.map((p) => p.titre), ["Deux"]);
  assert.equal(e.complet, false);
  assert.equal(etat("rien").complet, false, "une checklist vide n'est jamais complete");
});

test("sans base configuree : mode demonstration", () => {
  const c = generer({});
  assert.equal(c.supabaseUrl, "");
  assert.equal(c.modeTest, false);
});

test("base configuree mais checklist incomplete : mode demonstration", () => {
  const contenu = fs.readFileSync(path.join(__dirname, "..", "docs", "AVANT_OUVERTURE.md"), "utf8");
  if (etat(contenu).complet) return; // une fois la checklist cochee, ce cas ne s'applique plus
  const c = generer({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: CLE_OK });
  assert.equal(c.supabaseUrl, "");
});

test("MODE_TEST branche la base avec le bandeau", () => {
  const c = generer({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: CLE_OK, MODE_TEST: "1" });
  assert.equal(c.supabaseUrl, URL_OK);
  assert.equal(c.modeTest, true);
});

test("une URL invalide fait echouer le deploiement", () => {
  assert.throws(() => generer({ SUPABASE_URL: "https://exemple.com", SUPABASE_ANON_KEY: CLE_OK }));
});

test("la CSP est restreinte a la base exacte, ou fermee en demonstration", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "web", "index.html"), "utf8");
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), "pds-"));
  fs.writeFileSync(path.join(d1, "index.html"), html);
  generer({ SUPABASE_URL: URL_OK, SUPABASE_ANON_KEY: CLE_OK, MODE_TEST: "1" }, d1);
  const avec = fs.readFileSync(path.join(d1, "index.html"), "utf8");
  assert.match(avec, /connect-src 'self' https:\/\/abcdefghijklmnopqrst\.supabase\.co;/);
  assert.doesNotMatch(avec, /\*\.supabase\.co/);

  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "pds-"));
  fs.writeFileSync(path.join(d2, "index.html"), html);
  generer({}, d2);
  assert.match(fs.readFileSync(path.join(d2, "index.html"), "utf8"), /connect-src 'self';/);
});

test("la feuille de relecture du wolof liste toutes les chaines", () => {
  execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "relecture-wolof.js"), "--verifier"], { stdio: "pipe" });
});
