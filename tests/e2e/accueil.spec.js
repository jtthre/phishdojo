// Page d'accueil : contenu, navigation, ancien choix de langue ignoré, mise en page sur téléphone, et zéro requête externe.
"use strict";
const { test, expect } = require("@playwright/test");

function surveillerSorties(page) {
  const sorties = [];
  page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1")) sorties.push(r.url()); });
  return sorties;
}

test("accueil : titre, piliers et liens vers les pages existantes", async ({ page }) => {
  const sorties = surveillerSorties(page);
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Repérez l'arnaque avant qu'elle vous repère.");
  await expect(page).toHaveTitle("Accueil · PhishDojo");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveAttribute("href", "index.html");
  await expect(page.locator("nav a")).toHaveCount(6);
  await expect(page.locator('.ac-heros a.btn.primary')).toHaveAttribute("href", "verifier.html");
  await expect(page.locator('a.ac-pilier[href="verifier.html"]')).toHaveCount(1);
  // le pilier à venir (Observer) n'est pas un lien
  await expect(page.locator(".ac-futur")).toHaveCount(1);
  await expect(page.locator("div.ac-futur a")).toHaveCount(0);
  // chaque lien interne mène à une page qui existe
  const internes = await page.$$eval("main a[href]", (as) => as.map((a) => a.getAttribute("href")).filter((h) => !/^https?:/.test(h)));
  for (const href of new Set(internes)) {
    const rep = await page.request.get("/" + href);
    expect(rep.status(), href).toBe(200);
  }
  await page.locator(".ac-aplat .ac-colle").click();
  await expect(page).toHaveURL(/signaler\.html$/);
  expect(sorties).toEqual([]);
});

test("accueil : un ancien choix du wolof enregistré est ignoré, puis effacé", async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem("vu")) { localStorage.setItem("pds.lang", '"wo"'); sessionStorage.setItem("vu", "1"); } });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("h1")).toHaveText("Repérez l'arnaque avant qu'elle vous repère.");
  await expect(page.locator("[data-lang]")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("pds.lang"))).toBeNull();
});

test("accueil : la page refuse d'etre encadree par un autre site", async ({ page }) => {
  await page.setContent('<iframe id="f" src="http://127.0.0.1:4173/" width="800" height="600"></iframe>');
  await page.waitForTimeout(1500);
  await expect(page.frameLocator("#f").locator("h1")).toHaveCount(0);
});

test("accueil : pas de debordement horizontal sur telephone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde).toBe(false);
});
