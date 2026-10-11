// Base branchee en MODE_TEST : bandeau « version de test », puis ce qui part reellement vers
// Supabase. La configuration est servie par le test et l'API est interceptee : aucune requete
// ne quitte la machine.
"use strict";
const { test, expect } = require("@playwright/test");

const BASE = "https://abcdefghijklmnopqrst.supabase.co";
const CLE = "sb_publishable_cleDeTest0123456789";
const JWT_ANON = "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ iss: "supabase", role: "anon" })).toString("base64url") + ".signatureFactice";
const MESSAGE = "Bonjour Awa, vous avez recu 15 000F de MOUSSA DIOP (77 123 45 67). Ref: CI231005.1512.A12345. " +
  "Suivi : https://suivi-colis.top/c/AB12CD34?tel=771234567";

// Sert un config.js de test, intercepte l'API et note chaque appel (hors requetes CORS preliminaires).
// Toute autre requete vers l'exterieur est bloquee et notee : rien ne peut quitter la machine.
async function brancher(page, config) {
  const appels = [];
  const sorties = [];
  const local = (u) => u.protocol === "http:" && u.hostname === "127.0.0.1";
  const base = (u) => u.origin === BASE;
  await page.route((u) => !local(u) && !base(u), (route) => {
    sorties.push(route.request().url());
    return route.abort();
  });
  await page.route("**/config.js", (route) => route.fulfill({
    contentType: "text/javascript; charset=utf-8",
    body: "window.PDS_CONFIG = " + JSON.stringify(config) + ";"
  }));
  await page.route(BASE + "/**", async (route) => {
    const req = route.request();
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer"
    };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    appels.push({ url: req.url(), methode: req.method(), entetes: await req.allHeaders(), corps: req.postDataJSON() });
    if (req.url().endsWith("/rest/v1/rpc/supprimer_signalement")) {
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "true" });
    }
    return route.fulfill({ status: 201, headers: cors, body: "" });
  });
  return { appels, sorties };
}

async function envoyer(page) {
  await page.goto("/");
  await page.fill("#msg", MESSAGE);
  await page.fill("#exp", "+221 78 111 22 33");
  await page.check("#consent");
  await page.check("#adult");
  await page.click("#send");
  await expect(page.locator("#done-view")).toBeVisible();
}

test("mode demonstration : pas de bandeau", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#test-banner")).toBeHidden();
});

test("MODE_TEST : bandeau visible, en francais et en wolof", async ({ page }) => {
  const { appels, sorties } = await brancher(page, { supabaseUrl: BASE, supabaseAnonKey: CLE, modeTest: true });
  await page.goto("/");
  await expect(page.locator("#test-banner")).toBeVisible();
  await expect(page.locator("#test-banner")).toHaveText(/^Version de test/);
  await page.click('[data-lang="wo"]');
  await expect(page.locator("#test-banner")).toHaveText(/^Version test la/);
  expect(appels).toEqual([]);
  expect(sorties).toEqual([]);
});

test("MODE_TEST : un seul envoi, texte masque, cle publique dans apikey seulement", async ({ page }) => {
  const { appels, sorties } = await brancher(page, { supabaseUrl: BASE, supabaseAnonKey: CLE, modeTest: true });
  await envoyer(page);
  await expect(page.locator("#demo-note")).toBeHidden();

  expect(appels).toHaveLength(1);
  const [envoi] = appels;
  expect(envoi.url).toBe(BASE + "/rest/v1/signalements");
  expect(envoi.methode).toBe("POST");
  expect(envoi.entetes["apikey"]).toBe(CLE);
  expect(envoi.entetes["authorization"]).toBeUndefined();
  expect(envoi.entetes["prefer"]).toBe("return=minimal");
  expect(envoi.entetes["cookie"]).toBeUndefined();
  expect(envoi.entetes["referer"]).toBeUndefined();

  // seul le texte masque part ; le numero de l'expediteur est remplace par une empreinte cote serveur
  expect(envoi.corps.texte).not.toMatch(/77 123|771234567|DIOP|Awa|CI231005|15 000/);
  expect(envoi.corps.texte).toContain("[NUMÉRO]");
  expect(envoi.corps.domaines).toEqual(["suivi-colis.top"]);
  expect(envoi.corps.expediteur).toBe("221781112233");
  expect(Object.keys(envoi.corps).sort()).toEqual(
    ["canal", "domaines", "expediteur", "id", "langue", "marque", "mode", "recu_le", "texte", "version_masquage"]);
  await expect(page.locator("#report-id")).toHaveText(envoi.corps.id);

  // suppression avec l'identifiant remis
  await page.locator("#h-priv").click();
  await page.fill("#del-id", envoi.corps.id);
  await page.click("#del");
  await expect(page.locator("#del-status")).toHaveText("Signalement supprimé.");
  expect(appels).toHaveLength(2);
  expect(appels[1].url).toBe(BASE + "/rest/v1/rpc/supprimer_signalement");
  expect(appels[1].corps).toEqual({ p_id: envoi.corps.id });
  expect(appels[1].entetes["authorization"]).toBeUndefined();

  expect(sorties).toEqual([]);
});

test("ancienne cle anon (JWT) : aussi envoyee dans Authorization", async ({ page }) => {
  const { appels, sorties } = await brancher(page, { supabaseUrl: BASE, supabaseAnonKey: JWT_ANON, modeTest: true });
  await envoyer(page);
  expect(appels).toHaveLength(1);
  expect(appels[0].entetes["apikey"]).toBe(JWT_ANON);
  expect(appels[0].entetes["authorization"]).toBe("Bearer " + JWT_ANON);
  expect(sorties).toEqual([]);
});
