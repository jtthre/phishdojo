// Page « Vérifier » : verdict du modèle sur l'appareil, aucune requête pendant l'analyse,
// aucun lien cliquable, pas d'injection, temps de réponse et mise en page sur téléphone.
"use strict";
const { test, expect } = require("@playwright/test");

// Liens de test neutralisés : imitation publiée dans ml/README.md, et le vrai site des impôts
const MESSAGE = "Votre compte est bloque. Connectez-vous ici : hxxps://accounts.googIe[.]com/signin " +
  "ou sur le site officiel https://www.impots.gouv.fr/portail/particulier. Montant 25.000F.";

async function analyser(page, texte) {
  await expect(page.locator("#analyser")).toBeEnabled();
  await page.fill("#texte", texte);
  await page.click("#analyser");
}

test("vérifier : verdicts, propriétaire réel du lien et raisons, sans aucune requête", async ({ page }) => {
  await page.goto("/verifier.html");
  await expect(page).toHaveTitle("Vérifier un lien · PhishDojo");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveAttribute("href", "verifier.html");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("connect-src 'none'");

  await expect(page.locator("#analyser")).toBeEnabled();
  const requetes = [];
  page.on("request", (r) => requetes.push(r.url()));
  await analyser(page, MESSAGE);

  const cartes = page.locator(".vf-resultat");
  await expect(cartes).toHaveCount(2);
  await expect(cartes.nth(0)).toHaveClass(/vf-n3/);
  await expect(cartes.nth(0).locator(".vf-verdict strong")).toHaveText("Arnaque probable");
  await expect(cartes.nth(0).locator(".vf-url")).toHaveText("hxxps://accounts[.]googIe[.]com/signin");
  await expect(cartes.nth(0).locator(".vf-proprio code")).toHaveText("googie[.]com");
  await expect(cartes.nth(0).locator(".vf-raisons li")).toHaveCount(3);
  await expect(cartes.nth(1)).toHaveClass(/vf-n0/);
  await expect(cartes.nth(1).locator(".vf-verdict strong")).toHaveText("Pas de signe net d'arnaque");

  // détails pour analyste : seuils mesurés, 31 attributs
  await cartes.nth(0).locator("summary").click();
  await expect(cartes.nth(0).locator(".vf-analyste code", { hasText: /^tld$/ })).toHaveCount(1);
  expect(await cartes.nth(0).locator(".vf-analyste table").last().locator("tbody tr").count()).toBe(31);

  // aucun lien analysé n'est cliquable, rien n'est parti, rien n'est gardé
  const liens = await page.$$eval("#resultats a[href]", (as) => as.map((a) => a.getAttribute("href")));
  expect(liens.length).toBeGreaterThan(0);
  expect(liens.every((h) => h === "signaler.html")).toBe(true);
  expect(page.url()).toMatch(/\/verifier\.html$/);
  const cles = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
  expect(cles.filter((k) => k !== "pds.lang" && k !== "pd.theme")).toEqual([]);
  expect(requetes).toEqual([]);
});

test("vérifier : leurres visuels rendus visibles, résultats effacés quand le texte change", async ({ page }) => {
  await page.goto("/verifier.html");
  const RLO = String.fromCharCode(0x202e);
  await analyser(page, "https://paypal.com" + RLO + "/moc.example http://exemple.com/r?u=http://autre.example/x");
  await expect(page.locator(".vf-url").first()).toContainText("‹U+202E›");
  await expect(page.locator(".vf-url").nth(1)).toHaveText("hxxp://exemple[.]com/r?u=hxxp://autre[.]example/x");
  await page.locator("#texte").press("End");
  await page.locator("#texte").type(" ");
  await expect(page.locator(".vf-resultat")).toHaveCount(0);
});

test("vérifier : la langue change les résultats affichés", async ({ page }) => {
  await page.goto("/verifier.html");
  await analyser(page, MESSAGE);
  await page.click('[data-lang="wo"]');
  await expect(page.locator(".vf-resultat").first().locator(".vf-verdict strong")).toHaveText("Mel na ni naxe");
  await expect(page.locator('nav a[href="verifier.html"]')).toHaveText("Seetal");
});

test("vérifier : messages sans lien, vide, et liens tronqués à dix", async ({ page }) => {
  await page.goto("/verifier.html");
  await analyser(page, "   ");
  await expect(page.locator("#resultats .error")).toBeVisible();
  await analyser(page, "Envoyez le code recu par SMS au 77 000 00 00.");
  await expect(page.locator("#resultats .note")).toContainText("Aucun lien");
  await analyser(page, Array.from({ length: 12 }, (_, i) => `http://site${i}.example/`).join(" "));
  await expect(page.locator(".vf-resultat")).toHaveCount(10);
  await expect(page.locator("#resultats > .note")).toContainText("10 premiers");
  await page.click("#effacer");
  await expect(page.locator(".vf-resultat")).toHaveCount(0);
  await expect(page.locator("#texte")).toHaveValue("");
});

test("vérifier : une adresse piégée reste du texte (pas d'injection)", async ({ page }) => {
  let alerte = false;
  page.on("dialog", (d) => { alerte = true; d.dismiss(); });
  await page.goto("/verifier.html");
  await analyser(page, 'http://exemple.com/"><img/src=x/onerror=alert(1)><script>alert(2)</script>');
  await expect(page.locator(".vf-resultat")).toHaveCount(1);
  await expect(page.locator("#resultats img, #resultats script")).toHaveCount(0);
  await expect(page.locator(".vf-url")).toContainText("<img/src=x");
  expect(alerte).toBe(false);
});

test("vérifier : verdict en moins d'une seconde avec un processeur ralenti six fois", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "ralentissement via le protocole Chrome");
  await page.goto("/verifier.html");
  // la page préchauffe le moteur dès qu'elle est inactive, comme pendant la saisie d'un message
  await expect(page.locator('body[data-moteur="pret"]')).toHaveCount(1);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.fill("#texte", "hxxps://accounts.googIe[.]com/signin");
  // médiane de trois analyses : une seule mesure dépend trop de la charge de la machine de test
  const mesures = await page.evaluate(() => [0, 1, 2].map(() => {
    const t = performance.now();
    document.getElementById("analyser").click(); // l'analyse et l'affichage sont synchrones
    return performance.now() - t;
  }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await expect(page.locator(".vf-resultat")).toHaveCount(1);
  const ms = mesures.sort((x, y) => x - y)[1];
  console.log("analyse ralentie x6 :", mesures.map(Math.round).join(" / "), "ms");
  expect(ms).toBeLessThan(1000);
});

test("vérifier : sans modèle, la page le dit et n'analyse rien", async ({ page }) => {
  await page.route("**/modele/url-lgbm.js*", (r) => r.abort());
  await page.goto("/verifier.html");
  await expect(page.locator("#resultats .error")).toContainText("modèle");
  await expect(page.locator("#analyser")).toBeDisabled();
  // l'explication reste affichée quand on commence à écrire
  await page.locator("#texte").type("a");
  await expect(page.locator("#resultats .error")).toContainText("modèle");
});

test("vérifier : pas de débordement horizontal sur téléphone, détails ouverts", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/verifier.html");
  await analyser(page, MESSAGE);
  await page.locator(".vf-resultat summary").first().click();
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde).toBe(false);
});
