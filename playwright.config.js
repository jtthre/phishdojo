// Tests de bout en bout de la page de signalement (Chromium, mode demonstration).
"use strict";
const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    // navigateur deja installe ailleurs (poste local, conteneur) : PW_CHROMIUM=/chemin/vers/chromium
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "telephone", use: { ...devices["Pixel 7"] } }
  ],
  webServer: { command: "node tests/e2e/serveur.js", url: "http://127.0.0.1:4173", reuseExistingServer: false }
});
