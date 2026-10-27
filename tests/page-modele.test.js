/* Page « Le modèle » : les chiffres affichés viennent des rapports et du modèle actuels.
 * - data-mesure : nombre recalculé depuis ml/reports/ (métriques, rapport du réentraînement,
 *   rapport de parité, variante sans TLD), le jeu de référence ou le modèle exporté ;
 * - data-score et data-niveau : score et verdict recalculés par le moteur du site ;
 * - tout autre nombre de la page doit figurer dans AUTRES_NOMBRES, avec ce qu'il désigne.
 * Après un réentraînement, ce test échoue tant que la page annonce les anciens chiffres. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");

const RACINE = path.join(__dirname, "..");
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), "utf8");

const PAGE = lire("web", "modele.html");
const ACCUEIL = lire("web", "index.html");
const MET = JSON.parse(lire("ml", "reports", "metriques.json"));
const SANS_TLD = JSON.parse(lire("ml", "reports_sans_tld", "metriques.json"));
const RAPPORT = lire("ml", "reports", "rapport.md");
const REENT = lire("ml", "reports", "reentrainement_sn.md").replace(/\r\n/g, "\n");
const PARITE = lire("ml", "reports", "parite_web.md");
const REF = JSON.parse(lire("tests", "parite", "reference.json"));

// moteur du site, chargé comme dans parite.test.js (le modèle est lu comme une donnée)
const texteModele = lire("web", "modele", "url-lgbm.js");
const D = JSON.parse(/^\/\*[^*]*\*\/\r?\nwindow\.PDS_MODELE_URL=(\{.*\});\r?\n$/s.exec(texteModele)[1]);
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(lire("web", "i18n.js"), ctx);
vm.runInContext(lire("web", "moteur-url.js"), ctx);
const M = ctx.window.PDS_MOTEUR_URL.creer(D);

const virgule = (x, n) => x.toFixed(n).replace(".", ",");
const pct = (x, n) => virgule(100 * x, n) + " %";
const entier = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const environ = (n) => "≈ " + entier(Math.round(n / 10) * 10);
const normaliser = (s) => s.replace(/&nbsp;/g, " ").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const nombre = (s) => Number(s.replace(/[\s  ]/g, "").replace(",", "."));

function trouver(texte, motif, quoi) {
  const m = motif.exec(texte);
  assert.ok(m, quoi + " : introuvable " + motif);
  return m;
}

// ---- ml/reports/reentrainement_sn.md : tableaux markdown, colonnes repérées par leur en-tête
function section(titre) {
  const i = REENT.indexOf("### " + titre);
  assert.ok(i >= 0, "reentrainement_sn.md : section « " + titre + " » introuvable");
  const j = REENT.indexOf("\n#", i + 4);
  return REENT.slice(i, j < 0 ? undefined : j);
}
const cellules = (ligne) => ligne.split("|").slice(1, -1).map((c) => c.trim());
function tableau(titre) {
  const lignes = section(titre).split("\n").filter((l) => l.startsWith("|"));
  return { entete: cellules(lignes[0]), lignes: lignes.slice(2).map(cellules) };
}
// le modèle publié est la ligne marquée « (retenu) », l'ancien la ligne « Ancien modèle »
const RETENU = (l) => /\(retenu\)/.test(l[0]);
const ANCIEN = (l) => /^Ancien modèle/.test(l[0]);
const premierPct = (cellule) => nombre(trouver(cellule, /([\d,]+) %/, cellule)[1]) / 100;
const pctEntreParentheses = (cellule) => nombre(trouver(cellule, /\(([\d,]+) %/, cellule)[1]) / 100;
function ligne(t, choix, quoi) {
  const l = t.lignes.find(choix);
  assert.ok(l, "reentrainement_sn.md : ligne introuvable (" + quoi + ")");
  return l;
}

const ORIGINE = tableau("Test temporel d'origine");
const PAR_SOURCE = tableau("Pages légitimes du test, par source");
const WWW = tableau("Pages d'accueil légitimes en `www.` du test");
const SN = tableau("Pages `.sn` légitimes du test");
const SN_RAPPEL = tableau("Phishing du test réhébergé en `.sn`");
const colFp90 = (t) => t.entete.findIndex((c) => /90 %/.test(c));
const colFp80 = (t) => t.entete.findIndex((c) => /80 %/.test(c));
const francais = ligne(PAR_SOURCE, (l) => /^Pages profondes de sites français/.test(l[0]), "sites français");
const colonne = (prefixe) => PAR_SOURCE.entete.findIndex((c) => c.startsWith(prefixe));
// « 8,3 % / 0,6 % » : seuil « 90 % », puis « 80 % » ; variantes entraînées : toutes sauf l'ancien et A (sans correctif www)
const fr90 = (i) => premierPct(francais[i]);
const variantesFr = PAR_SOURCE.entete.map((c, i) => i).filter((i) => i >= 2 && !/^Ancien|^A,/.test(PAR_SOURCE.entete[i]));

const S = Object.fromEntries(MET.lgbm.eval.seuils.map((s) => [Math.round(s.cible * 100), s]));
const DEC = MET.decoupe;
const CMP = MET.comparaison_decoupes;
const accueils = trouver(REENT, /Les ([\d\s  ]+) pages d'accueil légitimes du corpus d'origine[^\n]*? : (\d+) seulement commençaient par `www\.`/, "reentrainement_sn.md, section 4");

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
  // composition des légitimes du test
  "test-origine": entier(Number(trouver(section("Test temporel d'origine"), /(\d+) légitimes/, "test d'origine")[1])),
  "test-www": entier(Number(trouver(section("Pages d'accueil légitimes en `www.` du test"), /(\d+) pages/, "pages www")[1])),
  "test-sn": entier(Number(trouver(section("Pages `.sn` légitimes du test"), /(\d+) pages/, "pages .sn")[1])),
  "origine-tfp-80": pct(premierPct(ligne(ORIGINE, RETENU, "test d'origine")[colFp80(ORIGINE)]), 2),
  "origine-tfp-90": pct(premierPct(ligne(ORIGINE, RETENU, "test d'origine")[colFp90(ORIGINE)]), 2),
  // avant / après, au seuil « 90 % »
  "accueils": entier(nombre(accueils[1])),
  "accueils-www": accueils[2],
  "avant-www": pct(pctEntreParentheses(ligne(WWW, ANCIEN, "www, ancien")[colFp90(WWW)]), 1),
  "apres-www": pct(pctEntreParentheses(ligne(WWW, RETENU, "www, retenu")[colFp90(WWW)]), 1),
  "avant-sn": pct(pctEntreParentheses(ligne(SN, ANCIEN, ".sn, ancien")[colFp90(SN)]), 1),
  "apres-sn": pct(pctEntreParentheses(ligne(SN, RETENU, ".sn, retenu")[colFp90(SN)]), 1),
  "avant-origine": pct(premierPct(ligne(ORIGINE, ANCIEN, "test d'origine, ancien")[colFp90(ORIGINE)]), 2),
  "apres-origine": pct(premierPct(ligne(ORIGINE, RETENU, "test d'origine, retenu")[colFp90(ORIGINE)]), 2),
  "avant-fr": pct(fr90(colonne("Ancien modèle")), 1),
  "apres-fr": pct(fr90(PAR_SOURCE.entete.findIndex((c) => /\(retenu\)/.test(c))), 1),
  "avant-sn-rappel": pct(premierPct(ligne(SN_RAPPEL, ANCIEN, "réhébergé, ancien")[colFp90(SN_RAPPEL)]), 1),
  "apres-sn-rappel": pct(premierPct(ligne(SN_RAPPEL, RETENU, "réhébergé, retenu")[colFp90(SN_RAPPEL)]), 1),
  // limites
  "fr-sur-100": String(Math.round(100 * fr90(PAR_SOURCE.entete.findIndex((c) => /\(retenu\)/.test(c))))),
  "fr-min": pct(Math.min(...variantesFr.map(fr90)), 1),
  "fr-max": pct(Math.max(...variantesFr.map(fr90)), 1),
  "tld": trouver(RAPPORT, /extension du domaine \(TLD\) — ([\d,]+ %)/, "rapport.md, importance")[1],
  "sans-tld-90": pct(SANS_TLD.lgbm.eval.seuils.find((s) => s.cible === 0.9).tfp, 1),
  // dans le navigateur
  "attributs": String(D.attributs.length),
  "arbres": String(REF.nb_arbres),
  "parite-cas": entier(REF.cas.length),
  "parite-urls": entier(nombre(trouver(PARITE, /\| URL comparées \| ([\d\s  ]+) \(/, "parite_web.md")[1])),
  "parite-differences": trouver(PARITE, /\| Verdicts différents \| (\d+) \|/, "parite_web.md")[1],
  "poids-compresse": virgule(zlib.gzipSync(texteModele).length / 1e6, 1),
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
  "googie-connexion": "accounts.googIe.com/signin/v2/identifier",
  "wikipedla": "fr.wikipedla.org/wiki/Hameconnage",
  "lemonde-www": "https://www.lemonde.fr/",
  "github": "github.com/login",
  "letsdefend": "app.letsdefend.io/login",
};
// verdict public de la page Vérifier (niveauPublic dans web/verifier.js)
const VERDICT = (n) => (n >= 3 ? "« Arnaque probable »" : n === 2 ? "« Douteux »" : "pas de signe net");
// ce que la page affirme du verdict, sans afficher de libellé : « fausses alertes connues », « passe »
const NIVEAUX_AFFIRMES = { github: (n) => n >= 2, letsdefend: (n) => n >= 2, wikipedla: (n) => n < 2, "lemonde-www": (n) => n < 2 };

// nombres de la page qui ne dépendent pas du modèle publié
const AUTRES_NOMBRES = {
  "0": "échelle des scores, de 0 à 1 (légende du premier tableau)",
  "97,17": "exactitude annoncée par la fiche du modèle public, sur son propre jeu d'évaluation",
  "1,00": "score du modèle public sur le site des impôts (audit du 3 octobre 2026, ml/space/README.md)",
  "2": "audit du modèle public : 2 sites légitimes sur 5 basculent en http",
  "5": "idem",
  "3": "date de l'audit (3 octobre)",
  "2026": "années",
  "12": "début du test (12 juin 2026)",
  "90": "rappel visé et seuil « 90 % »",
  "80": "seuil « 80 % »",
  "95": "seuil « 95 % » et IC à 95 %",
  "100 000": "adresses par jour (convention du protocole)",
  "1": "taux de base, 1 sur 1 000",
  "1 000": "idem",
  "100": "« sur 100 phishing », « sur 100 pages »",
  "0,1": "taux de faux positifs de la comparaison des découpes",
  "35": "écart découpe aléatoire / temporelle selon les versions du corpus (ml/README.md)",
  "50": "idem",
  "0,91": "score de l'ancien modèle pour www.lemonde.fr (ml/accueils_www.py)",
};

function marques(html) {
  return [...html.matchAll(/<\w+[^>]*\sdata-(mesure|score|niveau)="([^"]+)"[^>]*>([^<]*)</g)]
    .map((m) => ({ type: m[1], cle: m[2], texte: normaliser(m[3]) }));
}
const PAGE_MARQUES = marques(PAGE);
const connue = (m) => ({ mesure: MESURES, score: SCORES, niveau: SCORES })[m.type][m.cle] !== undefined;

function verifierMarques(liste) {
  for (const m of liste) {
    assert.ok(connue(m), `data-${m.type}="${m.cle}" inconnu du test`);
    if (m.type === "mesure") assert.equal(m.texte, MESURES[m.cle], `data-mesure="${m.cle}"`);
    const a = m.type === "mesure" ? null : M.analyser(SCORES[m.cle]);
    if (m.type === "score") assert.equal(m.texte, virgule(a.proba, 2), `data-score="${m.cle}" (${SCORES[m.cle]})`);
    if (m.type === "niveau") assert.equal(m.texte, VERDICT(a.niveau), `data-niveau="${m.cle}" (${SCORES[m.cle]})`);
  }
}

test("chaque mesure et chaque score du test est affiché sur la page, et chaque marque est connue", () => {
  const vues = (type) => new Set(PAGE_MARQUES.filter((m) => m.type === type).map((m) => m.cle));
  assert.deepEqual([...vues("mesure")].sort(), Object.keys(MESURES).sort());
  assert.deepEqual([...vues("score")].sort(), Object.keys(SCORES).sort());
  for (const m of PAGE_MARQUES) assert.ok(connue(m), `data-${m.type}="${m.cle}" inconnu du test`);
});

test("les chiffres marqués sont ceux de ml/reports/, du modèle exporté et du moteur du site", () => {
  verifierMarques(PAGE_MARQUES);
  for (const [cle, ok] of Object.entries(NIVEAUX_AFFIRMES)) {
    assert.ok(ok(M.analyser(SCORES[cle]).niveau), `verdict de ${SCORES[cle]} contraire à ce qu'affirme la page`);
  }
});

test("aucun autre nombre sur la page, hors de la liste commentée", () => {
  let main = trouver(PAGE, /<main[^>]*>([\s\S]*)<\/main>/, "modele.html")[1];
  main = main.replace(/<(\w+)[^>]*\sdata-(?:mesure|score|niveau)="[^"]+"[^>]*>[^<]*<\/\1>/g, " ")
    .replace(/<code>[^<]*<\/code>/g, " ")      // adresses citées
    .replace(/<a\s[^>]*>/g, " ")               // liens
    .replace(/<[^>]+>/g, " ");
  const restants = normaliser(main).match(/\d+(?: \d{3})*(?:,\d+)?/g) || [];
  const inconnus = [...new Set(restants)].filter((n) => !(n in AUTRES_NOMBRES));
  assert.deepEqual(inconnus, [], "nombre non marqué : le marquer (data-mesure) ou l'ajouter à AUTRES_NOMBRES avec ce qu'il désigne");
});

test("l'accueil cite les mêmes chiffres que la page", () => {
  const liste = marques(ACCUEIL);
  assert.ok(liste.length >= 2);
  verifierMarques(liste);
});

test("les métriques des rapports sont celles du modèle publié", () => {
  const sha = trouver(lire("ml", "models", "SHA256SUMS"), /^([0-9a-f]{64}) \*lgbm\.joblib$/m, "SHA256SUMS")[1];
  const m = /sha256 `([0-9a-f]{8,})…`/.exec(PARITE);
  assert.ok(m && sha.startsWith(m[1]), "ml/reports/parite_web.md est périmé : relancer « cd ml && python parite_web.py »");
  // le modèle exporté embarque ses propres mesures : elles doivent être celles de metriques.json
  assert.equal(D.mesures.auc, MET.lgbm.eval.auc, "ml/reports/metriques.json ne correspond pas au modèle exporté");
  for (const s of D.mesures.seuils) {
    const r = MET.lgbm.eval.seuils.find((x) => x.cible === s.cible);
    for (const k of ["seuil", "rappel", "tfp", "tfp_bas", "tfp_haut"]) assert.equal(s[k], r[k], `seuil ${s.cible}, ${k}`);
  }
});

test("le rapport du réentraînement porte sur le modèle publié", () => {
  const PERIME = "ml/reports/reentrainement_sn.md ne correspond pas au modèle publié : relancer « cd ml && python comparer_modeles.py »";
  // ses seuils sont ceux de metriques.json
  const seuils = tableau("Seuils de chaque modèle (fixés sur sa validation)");
  const retenu = ligne(seuils, RETENU, "seuils");
  for (const c of [80, 90, 95]) {
    const col = seuils.entete.findIndex((e) => e.includes(c + " %"));
    assert.equal(retenu[col], virgule(S[c].seuil, 3), PERIME + ` (seuil « ${c} % »)`);
  }
  // ses faux positifs au seuil « 90 % », par population, redonnent ceux du rapport principal
  const k = (t) => Number(trouver(ligne(t, RETENU, "comptes")[colFp90(t)], /^(\d+) \//, "compte")[1]);
  const origine = S[90].fp - k(WWW) - k(SN);
  assert.equal(pct(origine / nombre(MESURES["test-origine"]), 2), MESURES["origine-tfp-90"], PERIME + " (faux positifs par population)");
});

test("aucune adresse d'imitation n'est écrite en clair dans la page", () => {
  const bas = PAGE.toLowerCase();
  for (const url of Object.values(SCORES)) {
    const hote = url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    if (/googie|wikipedla/.test(hote)) assert.ok(!bas.includes(hote), hote + " doit être neutralisé ([.])");
  }
  assert.doesNotMatch(bas, /href="[^"]*(googie|wikipedla)/);
});
