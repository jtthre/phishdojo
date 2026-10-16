/* Empreintes des ressources au déploiement : une page mise à jour ne doit jamais charger une feuille
 * de style ou un script resté dans le cache du navigateur (voir scripts/versionner.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "versionner.js");

function copie() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pds-v-"));
  fs.writeFileSync(path.join(d, "style.css"), "body{color:red}");
  fs.writeFileSync(path.join(d, "app.js"), "console.info(1)");
  fs.writeFileSync(path.join(d, "index.html"),
    '<link rel="stylesheet" href="style.css"><script src="app.js"></script>' +
    '<a href="https://exemple.test/x.js">lien externe</a><a href="signaler.html">page</a>');
  return d;
}
const lancer = (d) => execFileSync(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, VERSIONNER_RACINE: d }, stdio: "pipe" });
const lire = (d) => fs.readFileSync(path.join(d, "index.html"), "utf8");

test("les ressources locales reçoivent une empreinte de leur contenu", () => {
  const d = copie();
  lancer(d);
  const html = lire(d);
  assert.match(html, /href="style\.css\?v=[0-9a-f]{12}"/);
  assert.match(html, /src="app\.js\?v=[0-9a-f]{12}"/);
  assert.match(html, /href="https:\/\/exemple\.test\/x\.js"/, "un lien externe n'est pas touché");
  assert.match(html, /href="signaler\.html"/, "un lien vers une page n'est pas touché");
});

test("idempotent, et l'empreinte change avec le contenu", () => {
  const d = copie();
  lancer(d);
  const premier = lire(d);
  lancer(d);
  assert.equal(lire(d), premier, "deux passages donnent le même résultat");
  fs.writeFileSync(path.join(d, "style.css"), "body{color:blue}");
  lancer(d);
  assert.notEqual(lire(d).match(/style\.css\?v=([0-9a-f]+)/)[1], premier.match(/style\.css\?v=([0-9a-f]+)/)[1]);
  assert.doesNotMatch(lire(d), /\?v=[0-9a-f]+\?v=/);
});

test("une ressource absente fait échouer le déploiement", () => {
  const d = copie();
  fs.rmSync(path.join(d, "app.js"));
  assert.throws(() => lancer(d));
});

test("les vraies pages du site : chaque ressource référencée existe et reçoit son empreinte", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pds-site-"));
  fs.cpSync(path.join(__dirname, "..", "web"), d, { recursive: true, filter: (s) => !s.includes(path.sep + "vendor") });
  // web/vendor (polices, OCR) est généré par npm run vendre : on le simule pour la feuille de polices
  fs.mkdirSync(path.join(d, "vendor"), { recursive: true });
  fs.writeFileSync(path.join(d, "vendor", "fonts.css"), "/* polices */");
  lancer(d);
  for (const page of fs.readdirSync(d).filter((n) => n.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(d, page), "utf8");
    assert.doesNotMatch(html, /\s(?:href|src)="[^"?#:]+\.(?:css|js|svg)"/, page + " : ressource sans empreinte");
  }
});
