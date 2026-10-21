/* PhishDojo - code commun aux pages : protection contre l'encadrement, langue, theme,
 * navigation. Aucun appel reseau ici. */
(function () {
  "use strict";

  // Anti-clickjacking : GitHub Pages ne permet pas d'envoyer l'en-tete frame-ancestors,
  // et la balise meta CSP l'ignore. Si la page est encadree par un autre site, on la vide.
  if (window.self !== window.top) {
    document.documentElement.innerHTML = "";
    try { window.top.location = window.self.location.href; } catch (e) { /* origine differente */ }
    throw new Error("Page encadree : affichage refuse.");
  }

  var I18N = window.PDS_I18N;
  var rappels = [];

  function lire(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var S = { lang: lire("pds.lang", "fr"), theme: lire("pd.theme", "light") };
  if (!I18N[S.lang]) S.lang = "fr";
  if (S.theme !== "dark") S.theme = "light";

  var PAGES = [["index.html", "navAccueil", "accueil"], ["verifier.html", "navVerifier", "verifier"], ["apprendre.html", "navApprendre", "apprendre"], ["signaler.html", "navSignaler", "signaler"], ["ou-signaler.html", "navOuSignaler", "ou-signaler"]];

  function T() { return I18N[S.lang]; }

  function appliquerLangue() {
    var t = T();
    var page = document.body.getAttribute("data-page");
    document.documentElement.lang = t.lang;
    document.querySelectorAll("[data-t]").forEach(function (el) {
      var v = t[el.getAttribute("data-t")];
      if (typeof v === "string") el.textContent = v;
    });
    document.querySelectorAll("[data-tph]").forEach(function (el) { el.placeholder = t[el.getAttribute("data-tph")]; });
    document.querySelectorAll("[data-lang]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === S.lang)); });
    var nav = document.getElementById("nav");
    if (nav) {
      nav.setAttribute("aria-label", t.navLabel);
      nav.innerHTML = PAGES.map(function (p) {
        return '<a href="' + p[0] + '"' + (p[2] === page ? ' aria-current="page"' : "") + ">" + esc(t[p[1]]) + "</a>";
      }).join("");
    }
    var titre = document.body.getAttribute("data-titre");
    document.title = (titre && t[titre] ? t[titre] + " · " : "") + t.brand;
    var b = document.getElementById("theme");
    if (b) b.setAttribute("aria-label", t.theme);
    rappels.forEach(function (fn) { fn(t); });
  }

  function appliquerTheme() {
    document.documentElement.setAttribute("data-theme", S.theme);
    var b = document.getElementById("theme");
    if (!b) return;
    var sombre = S.theme === "dark";
    b.setAttribute("aria-pressed", String(sombre));
    b.innerHTML = sombre
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="2"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a8 8 0 1 1-9-10 7 7 0 0 0 9 10z" fill="currentColor"/></svg>';
  }

  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      S.lang = b.getAttribute("data-lang");
      ecrire("pds.lang", S.lang);
      appliquerLangue();
    });
  });
  var bt = document.getElementById("theme");
  if (bt) bt.addEventListener("click", function () {
    S.theme = S.theme === "dark" ? "light" : "dark";
    ecrire("pd.theme", S.theme);
    appliquerTheme();
  });

  window.PDS = {
    T: T,
    esc: esc,
    langue: function () { return S.lang; },
    // une page s'abonne pour re-rendre son contenu propre a chaque changement de langue
    surLangue: function (fn) { rappels.push(fn); fn(T()); },
    demarrer: function () { appliquerTheme(); appliquerLangue(); }
  };
})();
