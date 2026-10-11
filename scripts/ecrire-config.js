// Ecrit web/config.js a partir des variables du depot (deploiement continu).
//
// Garde-fou : tant que docs/AVANT_OUVERTURE.md n'est pas entierement coche, la base n'est
// branchee que si MODE_TEST=1 (bandeau « version de test » sur la page). Sinon : mode
// demonstration, rien n'est envoye.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { lire } = require("./avant-ouverture.js");

const url = (process.env.SUPABASE_URL || "").trim();
const cle = (process.env.SUPABASE_ANON_KEY || "").trim();
const modeTest = /^(1|true|oui)$/i.test((process.env.MODE_TEST || "").trim());
const sortie = process.env.CONFIG_SORTIE || path.join(__dirname, "..", "web", "config.js");

if (url && !/^https:\/\/[a-z0-9]{10,40}\.supabase\.co\/?$/.test(url)) {
  console.error("SUPABASE_URL invalide : attendu https://<projet>.supabase.co");
  process.exit(1);
}
// Cle publique uniquement : publishable (sb_publishable_...) ou ancienne cle anon (jeton JWT de
// role anon). Une cle secrete ecrite dans config.js serait publiee sur le site et donnerait tous
// les droits sur la base : on arrete le deploiement, sans jamais afficher la cle.
function roleJwt(c) {
  try { return JSON.parse(Buffer.from(c.split(".")[1], "base64url").toString("utf8")).role; } catch (e) { return null; }
}
const jwt = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cle);
const role = jwt ? roleJwt(cle) : null;
if (cle && (/^sb_secret_/.test(cle) || (role && role !== "anon"))) {
  console.error("SUPABASE_ANON_KEY contient une cle secrete : elle ne doit jamais etre publiee. " +
                "Revoquer cette cle dans Supabase, puis mettre la cle publishable (sb_publishable_...).");
  process.exit(1);
}
if (cle && role !== "anon" && !/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(cle)) {
  console.error("SUPABASE_ANON_KEY invalide : attendu la cle publishable (sb_publishable_...).");
  process.exit(1);
}

const checklist = lire();
let config = { supabaseUrl: "", supabaseAnonKey: "", modeTest: false };
let message = "Aucune base configuree : mode demonstration.";

if (url && cle) {
  if (checklist.complet) {
    config = { supabaseUrl: url, supabaseAnonKey: cle, modeTest: false };
    message = "Collecte ouverte : envoi vers " + url;
  } else if (modeTest) {
    config = { supabaseUrl: url, supabaseAnonKey: cle, modeTest: true };
    message = "MODE_TEST : base branchee avec le bandeau « version de test ». Restent : " +
      checklist.restants.map((p) => p.titre).join(" ; ");
  } else {
    message = "Base configuree mais checklist d'ouverture incomplete : mode demonstration. Restent : " +
      checklist.restants.map((p) => p.titre).join(" ; ");
    if (process.env.GITHUB_ACTIONS) console.log("::warning::" + message);
  }
}

const contenu = "/* Genere par scripts/ecrire-config.js lors du deploiement. */\n" +
  "window.PDS_CONFIG = " + JSON.stringify(config, null, 2) + ";\n";
fs.writeFileSync(sortie, contenu);

// Politique de securite du contenu : on remplace le joker *.supabase.co par l'adresse exacte
// de la base, ou on le retire en mode demonstration. Le navigateur ne pourra alors parler
// qu'a ce seul domaine, meme en cas d'injection de script.
const dossierWeb = process.env.CSP_RACINE || path.join(__dirname, "..", "web");
for (const f of fs.readdirSync(dossierWeb).filter((n) => n.endsWith(".html"))) {
  const chemin = path.join(dossierWeb, f);
  const html = fs.readFileSync(chemin, "utf8");
  const cible = config.supabaseUrl ? config.supabaseUrl.replace(/\/$/, "") : "";
  const nouveau = html.replace(/ https:\/\/\*\.supabase\.co/g, cible ? " " + cible : "");
  if (nouveau !== html) fs.writeFileSync(chemin, nouveau);
}

console.log(message);
