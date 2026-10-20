/* Regles de securite du site, verifiees a chaque push.
 * Elles rendent l'injection de script inexploitable meme si une faille d'affichage apparaissait. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const WEB = path.join(__dirname, "..", "web");
const pages = fs.readdirSync(WEB).filter((f) => f.endsWith(".html"));
const scripts = fs.readdirSync(WEB).filter((f) => f.endsWith(".js"));
const lire = (f) => fs.readFileSync(path.join(WEB, f), "utf8");

function csp(html) {
  const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  if (!m) return null;
  const d = {};
  for (const part of m[1].split(";")) {
    const [nom, ...valeurs] = part.trim().split(/\s+/);
    if (nom) d[nom] = valeurs;
  }
  return d;
}

test("il y a des pages a verifier", () => assert.ok(pages.length >= 3));

for (const page of pages) {
  const html = lire(page);

  test(`${page} : politique de securite du contenu stricte`, () => {
    const d = csp(html);
    assert.ok(d, "CSP absente");
    assert.deepEqual(d["default-src"], ["'self'"]);
    assert.deepEqual(d["object-src"], ["'none'"]);
    assert.deepEqual(d["base-uri"], ["'none'"]);
    assert.deepEqual(d["form-action"], ["'none'"]);
    const tout = Object.values(d).flat();
    for (const interdit of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "*", "http:", "https:", "data:"].filter((x) => x !== "data:")) {
      assert.ok(!tout.includes(interdit), `${interdit} interdit dans la CSP`);
    }
    assert.ok(!(d["script-src"] || []).some((s) => s.startsWith("http") || s === "blob:" || s === "data:"), "script-src doit rester 'self'");
    // seul domaine externe tolere : la base Supabase, pour l'envoi des signalements
    const externes = tout.filter((s) => /^https?:/.test(s));
    assert.ok(externes.every((s) => /^https:\/\/(\*|[a-z0-9]+)\.supabase\.co$/.test(s)), "domaine externe inattendu : " + externes.join(", "));
  });

  // seule la page de signalement parle a un serveur ; les autres ne peuvent rien envoyer, meme par erreur
  if (page !== "signaler.html") {
    test(`${page} : aucune connexion reseau permise (connect-src 'none')`, () => {
      assert.deepEqual(csp(html)["connect-src"], ["'none'"]);
    });
  }

  test(`${page} : aucun script ni style en ligne, aucun gestionnaire d'evenement HTML`, () => {
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, "script en ligne");
    assert.doesNotMatch(html, /<style[\s>]/i, "bloc <style>");
    assert.doesNotMatch(html, /\sstyle="/i, "attribut style");
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "attribut on*");
    assert.doesNotMatch(html, /javascript:/i, "lien javascript:");
  });

  test(`${page} : ressources servies par le site uniquement`, () => {
    const srcs = [...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
    const externes = srcs.filter((s) => /^(https?:)?\/\//.test(s));
    assert.deepEqual(externes, [], "ressource externe : " + externes.join(", "));
  });

  test(`${page} : liens externes sans fuite de contexte`, () => {
    for (const m of html.matchAll(/<a\s[^>]*href="https?:[^"]+"[^>]*>/gi)) {
      assert.match(m[0], /rel="[^"]*noopener[^"]*noreferrer|rel="[^"]*noreferrer[^"]*noopener/, "rel manquant : " + m[0]);
    }
  });

  test(`${page} : pas de referent envoye`, () => {
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
  });
}

for (const f of scripts) {
  test(`${f} : pas d'evaluation de code dynamique`, () => {
    const js = lire(f);
    assert.doesNotMatch(js, /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*["'`]|document\.write\s*\(/);
  });
}

test("aucun envoi reseau hors de signaler.js", () => {
  for (const f of scripts.filter((x) => x !== "signaler.js")) {
    assert.doesNotMatch(lire(f), /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/, f);
  }
});

test("signaler.js n'envoie que du texte passe par le masquage", () => {
  const js = lire("signaler.js");
  assert.match(js, /var texte = M\.masquer\(r\.texte\)\.texte;/);
  assert.match(js, /texte: texte,/);
  assert.doesNotMatch(js, /\$\("#msg"\)\.value\s*[,}]/, "le texte brut ne doit pas entrer dans la charge envoyee");
  assert.match(js, /credentials: "omit"/);
  assert.match(js, /referrerPolicy: "no-referrer"/);
});

test("le logo SVG reste inerte : ni script, ni lien, ni contenu etranger", () => {
  const svg = fs.readFileSync(path.join(WEB, "logo.svg"), "utf8");
  assert.doesNotMatch(svg, /<script|foreignObject|href\s*=|\son[a-z]+\s*=|url\(|@import/i);
});

test("le deploiement ne publie que web/ (ni archives/, ni ml/)", () => {
  const ci = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8");
  const envois = ci.match(/upload-pages-artifact@[\s\S]*?path:\s*(\S+)/g) || [];
  assert.equal(envois.length, 1, "un seul envoi vers GitHub Pages");
  assert.match(envois[0], /path:\s*web\s*$/);
});
