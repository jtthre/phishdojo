// Parcours complet en mode demonstration : coller, verifier l'apercu masque, masquer a la main, envoyer.
"use strict";
const { test, expect } = require("@playwright/test");

const MESSAGE = "Bonjour Awa, vous avez recu 15 000F de MOUSSA DIOP (77 123 45 67). Ref: CI231005.1512.A12345. " +
  "Suivi : https://suivi-colis.top/c/AB12CD34?tel=771234567 Mbissine vous salue.";

test("le message est masque avant l'envoi", async ({ page }) => {
  const sorties = [];
  page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1")) sorties.push(r.url()); });
  await page.goto("/signaler.html");
  await page.fill("#msg", MESSAGE);

  const apercu = page.locator("#preview");
  await expect(apercu).toContainText("[NUMÉRO]");
  await expect(apercu).toContainText("[MONTANT]");
  await expect(apercu).toContainText("[RÉFÉRENCE]");
  await expect(apercu).not.toContainText("77 123 45 67");
  await expect(apercu).not.toContainText("DIOP");
  await expect(page.locator("#domains")).toContainText("suivi-colis.top");

  // « Mbissine » n'est dans aucune liste : on le masque a la main
  await expect(apercu).toContainText("Mbissine");
  await apercu.evaluate((el) => {
    const n = [...el.childNodes].find((c) => c.nodeType === 3 && c.textContent.includes("Mbissine"));
    const i = n.textContent.indexOf("Mbissine");
    const r = document.createRange();
    r.setStart(n, i); r.setEnd(n, i + "Mbissine".length);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await page.click("#mask-sel");
  await expect(apercu).not.toContainText("Mbissine");
  await expect(apercu).toContainText("[MASQUÉ]");

  // envoi refuse sans les deux cases
  await page.click("#send");
  await expect(page.locator("#err")).toBeVisible();

  await page.fill("#exp", "+221 78 111 22 33");
  await page.check("#consent");
  await page.check("#adult");
  await page.click("#send");

  await expect(page.locator("#done-view")).toBeVisible();
  const charge = JSON.parse((await page.locator("#demo-json").textContent()).replace(/\s+\(→[^"]*\)/, ""));
  expect(charge.texte).not.toMatch(/77 123|771234567|DIOP|Awa|Mbissine|CI231005|15 000/);
  expect(charge.domaines).toEqual(["suivi-colis.top"]);
  expect(charge.id).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.locator("#report-id")).toHaveText(charge.id);

  // aucune requete vers l'exterieur en mode demonstration (hors polices)
  expect(sorties.filter((u) => !u.includes("fonts.g"))).toEqual([]);
});

test("l'interface passe en wolof et garde le choix", async ({ page }) => {
  await page.goto("/signaler.html");
  await page.click('[data-lang="wo"]');
  await expect(page.locator("h1")).toHaveText("Yëgal ab naxe");
  await expect(page.locator("html")).toHaveAttribute("lang", "wo");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Yëgal ab naxe");
});

test("pas de debordement horizontal sur telephone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/signaler.html");
  await page.fill("#msg", "https://un-tres-long-domaine-de-test-pour-verifier-le-retour-a-la-ligne.top/chemin/tres/long/AB12CD34EF56");
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde).toBe(false);
});
