// Serveur statique minimal pour les tests de bout en bout (aucune dependance).
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const racine = path.join(__dirname, "..", "..", "web");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const port = Number(process.env.PORT || 4173);
http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let fichier = path.normalize(path.join(racine, url));
  if (!fichier.startsWith(racine)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) fichier = path.join(fichier, "index.html");
  fs.readFile(fichier, (err, data) => {
    if (err) { res.writeHead(404); return res.end("introuvable"); }
    res.writeHead(200, { "Content-Type": types[path.extname(fichier)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}`));
