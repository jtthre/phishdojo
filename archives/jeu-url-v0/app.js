(function () {
  "use strict";
  var D = window.PD_DATA, TT = window.PD_T;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  // ------------------------------------------------------------ stockage local (facultatif)
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* indisponible */ } }

  var S = {
    lang: load("pd.lang", (navigator.language || "fr").slice(0, 2) === "en" ? "en" : "fr"),
    theme: load("pd.theme", "light"),
    name: load("pd.name", ""),
    avatar: load("pd.avatar", 0),
    mode: null, items: [], i: 0, score: 0, streak: 0, best: 0, correct: 0, aiCorrect: 0,
    results: [], t0: 0, answered: false
  };
  var t = function (k) { return TT[S.lang][k]; };

  // ------------------------------------------------------------ avatars
  var AV = [
    { c: "#E3B12F", p: '<path d="M16 4l10 4v7c0 7-5 11-10 13-5-2-10-6-10-13V8z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M11 16l4 4 7-8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' },
    { c: "#9FD3C7", p: '<path d="M3 16c4-7 9-10 13-10s9 3 13 10c-4 7-9 10-13 10S7 23 3 16z" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="16" r="5" fill="currentColor"/>' },
    { c: "#F2A7A0", p: '<circle cx="10" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M16 16h13M24 16v5M28 16v4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' },
    { c: "#B9C59C", p: '<rect x="7" y="14" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 14v-4a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="21" r="2" fill="currentColor"/>' },
    { c: "#C9B8F0", p: '<circle cx="13" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M19 19l9 9" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' },
    { c: "#A8CBEF", p: '<path d="M5 9h22M8 9l-2 4h20l-2-4M10 13v15M22 13v15M7 18h18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' }
  ];
  function avatarSvg(i) {
    var a = AV[i] || AV[0];
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="' + a.c + '" opacity=".32"/>' + a.p + "</svg>";
  }

  // ------------------------------------------------------------ icones (cartes sensi / situations)
  var ICON = {
    link: '<path d="M10 14a4 4 0 0 1 0-6l3-3a4 4 0 0 1 6 6l-1 1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14 10a4 4 0 0 1 0 6l-3 3a4 4 0 0 1-6-6l1-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    eye: '<path d="M2 12c3-6 17-6 20 0-3 6-17 6-20 0z" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
    shield: '<path d="M12 2l8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
    key: '<circle cx="8" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M13 12h9M18 12v4M22 12v3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    flag: '<path d="M6 3v18M6 4h12l-3 4 3 4H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>',
    mail: '<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    pdf: '<path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M14 3v4h4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 14h6M9 17h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  };
  function icon(name) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[name] || ICON.shield) + "</svg>"; }

  // ------------------------------------------------------------ ceintures
  var BELT_COLORS = ["#FFFFFF", "#F2C94C", "#3BA55C", "#8B5A2B", "#1A1A1A"];
  function beltIndex(acc) { return acc >= .9 ? 4 : acc >= .75 ? 3 : acc >= .6 ? 2 : acc >= .4 ? 1 : 0; }
  function beltSvg(i) {
    var c = BELT_COLORS[i];
    return '<svg class="belt" viewBox="0 0 360 90" role="img" aria-label="' + esc(t("grade")(t("belts")[i])) + '">' +
      '<rect x="4" y="30" width="352" height="26" rx="5" fill="' + c + '" stroke="#1B2550" stroke-width="3"/>' +
      '<rect class="knot" x="160" y="22" width="40" height="42" rx="6" fill="' + c + '" stroke="#1B2550" stroke-width="3"/>' +
      '<path d="M168 62l-14 24M192 62l14 24" stroke="#1B2550" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M168 62l-14 24M192 62l14 24" stroke="' + c + '" stroke-width="10" stroke-linecap="round"/></svg>';
  }

  // ------------------------------------------------------------ decoupage d'une adresse
  function splitUrl(url, reg) {
    var m = url.match(/^([a-z]+:\/\/)?([^\/?#]+)(.*)$/i) || [];
    var scheme = m[1] || "", host = m[2] || url, rest = m[3] || "";
    var i = host.toLowerCase().lastIndexOf(reg.toLowerCase());
    var sub = i > 0 ? host.slice(0, i) : "", main = i >= 0 ? host.slice(i) : host;
    var w = function (s) { return esc(s).replace(/([.\/?=&@-])/g, "$1<wbr>"); };
    return '<span class="dim">' + w(scheme + sub) + '</span><span class="reg">' + w(main) + '</span><span class="dim">' + w(rest) + "</span>";
  }

  // ------------------------------------------------------------ theme
  function setTheme(th) {
    S.theme = th; save("pd.theme", th);
    document.documentElement.setAttribute("data-theme", th);
    var b = $("#theme");
    if (b) { b.setAttribute("aria-pressed", String(th === "dark")); b.innerHTML = th === "dark" ? sunSvg() : moonSvg(); }
  }
  function moonSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a8 8 0 1 1-9-10 7 7 0 0 0 9 10z" fill="currentColor"/></svg>'; }
  function sunSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; }

  // ------------------------------------------------------------ langue + chrome
  function setLang(l) {
    S.lang = l; save("pd.lang", l);
    document.documentElement.lang = l;
    $("#lang-fr").setAttribute("aria-pressed", String(l === "fr"));
    $("#lang-en").setAttribute("aria-pressed", String(l === "en"));
    $("#foot").innerHTML = esc(t("foot"));
    rerender();
  }
  function rerender() {
    if (S.mode === "sensi") renderSensi();
    else if (S.mode && S.i < S.items.length) renderQuestion();
    else if (S.mode && S.mode !== "sensi") renderEnd();
    else renderHome();
  }

  function hud(show) {
    $("#hud").hidden = !show;
    if (show) {
      $("#hudScore").textContent = t("score") + " " + S.score;
      $("#hudStreak").textContent = t("streak") + " ×" + S.streak;
    }
  }

  // ------------------------------------------------------------ accueil
  function renderHome() {
    S.mode = null; hud(false);
    var scores = load("pd.scores", []);
    var html =
      '<section class="hero"><h1>' + esc(t("h1")) + "</h1><p>" + esc(t("tagline")) + "</p>" +
      '<div class="belt-strip" aria-hidden="true">' + BELT_COLORS.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") + "</div></section>" +
      '<section class="demo"><div class="loupe revealed"><p class="addr">' + splitUrl(D.urls[9].url, D.urls[9].reg) + '</p></div><p class="legend">' + esc(t("demoNote")) + "</p></section>" +
      '<section class="block"><h2><label for="pseudo">' + esc(t("pseudo")) + "</label></h2>" +
      '<input id="pseudo" class="field" maxlength="20" autocomplete="nickname" placeholder="' + esc(t("pseudoPh")) + '" value="' + esc(S.name) + '"></section>' +
      '<section class="block"><h2>' + esc(t("avatar")) + '</h2><div class="avatars" role="group" aria-label="' + esc(t("avatar")) + '">' +
      AV.map(function (_, i) { return '<button type="button" class="avatar" data-av="' + i + '" aria-pressed="' + (i === S.avatar) + '" aria-label="avatar ' + (i + 1) + '">' + avatarSvg(i) + "</button>"; }).join("") +
      "</div></section>" +
      '<section class="block"><h2>' + esc(t("modes")) + '</h2><div class="modes">' +
      modeCard("url", t("mUrl"), t("mUrlD"), D.urls.length) +
      modeCard("duel", t("mDuel"), t("mDuelD"), D.duel.length) +
      modeCard("sit", t("mSit"), t("mSitD"), D.situations.length) +
      "</div></section>" +
      '<section class="block sensi-cta"><button type="button" class="wide" id="toSensi">' + icon("shield") + "<span><strong>" + esc(t("sensiLink")) + "</strong><small>" + esc(t("sensiIntro")) + "</small></span></button></section>" +
      '<section class="block"><h2>' + esc(t("board")) + "</h2>" + boardHtml(scores) + "</section>";
    $("#screen").innerHTML = html;

    $("#pseudo").addEventListener("input", function (e) { S.name = e.target.value.trim(); save("pd.name", S.name); });
    document.querySelectorAll("[data-av]").forEach(function (b) {
      b.addEventListener("click", function () {
        S.avatar = +b.dataset.av; save("pd.avatar", S.avatar);
        document.querySelectorAll("[data-av]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
    document.querySelectorAll("[data-mode]:not([disabled])").forEach(function (b) {
      b.addEventListener("click", function () { start(b.dataset.mode); });
    });
    $("#toSensi").addEventListener("click", renderSensi);
  }

  function modeCard(mode, title, desc, n) {
    var ic = mode === "url" ? "eye" : mode === "duel" ? "shield" : "mail";
    return '<button type="button" class="mode" data-mode="' + mode + '">' + icon(ic) +
      "<strong>" + esc(title) + "</strong><span>" + esc(desc) + '</span><span class="count">' + n + " " + esc(t("challenges")) + "</span></button>";
  }

  function resourcesList() {
    return '<ul class="res">' + D.ressources.map(function (r) {
      return '<li><a href="' + esc(r.href) + '" target="_blank" rel="noopener">' + esc(r[S.lang]) + "</a></li>";
    }).join("") + "</ul>";
  }

  function boardHtml(scores) {
    if (!scores.length) return '<p class="muted">' + esc(t("boardEmpty")) + "</p>";
    return '<ol class="board">' + scores.slice(0, 8).map(function (s, i) {
      return '<li><span class="muted">' + (i + 1) + '</span><span class="mini">' + avatarSvg(s.avatar) + '</span><span class="who">' + esc(s.name) +
        ' <span class="muted">· ' + esc(t("belts")[s.belt]) + '</span></span><span class="score">' + s.score + " " + esc(t("pts")) + "</span></li>";
    }).join("") + "</ol>";
  }

  // ------------------------------------------------------------ sensibilisation
  function renderSensi() {
    S.mode = "sensi"; hud(false);
    $("#screen").innerHTML =
      '<section class="block"><button type="button" class="ghost" id="back">← ' + esc(t("back")) + "</button></section>" +
      '<section class="hero"><h1 style="font-size:clamp(34px,9vw,56px)">' + esc(t("sensiTitle")) + "</h1><p>" + esc(t("sensiIntro")) + "</p></section>" +
      '<section class="cards">' + D.sensi.map(function (c) {
        return '<article class="card">' + icon(c.icon) + "<div><h3>" + esc(c.title[S.lang]) + "</h3><p>" + esc(c.body[S.lang]) + "</p></div></article>";
      }).join("") + "</section>" +
      '<section class="block"><h2>' + esc(t("resources")) + "</h2>" + resourcesList() + "</section>";
    $("#back").addEventListener("click", renderHome);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ partie
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  function start(mode) {
    S.mode = mode;
    S.items = shuffle(mode === "duel" ? D.duel : mode === "sit" ? D.situations : D.urls);
    S.i = 0; S.score = 0; S.streak = 0; S.best = 0; S.correct = 0; S.aiCorrect = 0; S.results = [];
    renderQuestion();
  }

  function progressHtml() {
    return '<div class="progress" aria-hidden="true">' + S.items.map(function (_, i) {
      var r = S.results[i];
      return '<i class="' + (r === true ? "done-ok" : r === false ? "done-ko" : i === S.i ? "now" : "") + '"></i>';
    }).join("") + "</div>";
  }

  function renderQuestion() {
    hud(true); S.answered = false;
    var it = S.items[S.i], L = S.lang, body, opts, prompt;
    if (S.mode === "sit") {
      prompt = it.tech[L];
      body = '<div class="scene">' + icon(it.kind === "pdf" ? "pdf" : "mail") + "<p>" + esc(it.scene[L]) + "</p></div>";
      opts = it.choices.map(function (c, k) { return { v: String(k), label: c[L] }; });
    } else {
      prompt = t("q");
      body = '<div class="loupe" id="loupe"><p class="addr">' + splitUrl(it.url, it.reg) + "</p></div>";
      opts = [{ v: "legit", label: t("legit") }, { v: "phish", label: t("phish") }];
    }
    $("#screen").innerHTML =
      '<section class="block">' + progressHtml() +
      '<p class="prompt"><span class="muted">' + (S.i + 1) + " / " + S.items.length + "</span> · " + esc(S.mode === "sit" ? t("qSit") : prompt) + "</p>" +
      (S.mode === "sit" ? '<p class="tech">' + esc(it.tech[L]) + "</p>" : "") +
      body +
      '<div class="choices">' + opts.map(function (o) { return '<button type="button" class="choice" data-v="' + esc(o.v) + '">' + esc(o.label) + "</button>"; }).join("") + "</div>" +
      '<div id="fb" aria-live="polite"></div></section>';
    document.querySelectorAll(".choice").forEach(function (b) { b.addEventListener("click", function () { answer(b); }); });
    S.t0 = performance.now();
    window.scrollTo(0, 0);
  }

  function answer(btn) {
    if (S.answered) return; S.answered = true;
    var it = S.items[S.i], L = S.lang;
    var truth = S.mode === "sit" ? String(it.answer) : it.truth;
    var ok = btn.dataset.v === truth;
    var secs = (performance.now() - S.t0) / 1000;
    var gain = 0, parts = [];
    if (ok) {
      S.streak++; S.best = Math.max(S.best, S.streak); S.correct++;
      var combo = Math.min(100, 20 * (S.streak - 1)), speed = Math.max(0, Math.round(50 - 5 * secs));
      gain = 100 + combo + speed;
      if (combo) parts.push("+" + combo + " " + t("combo"));
      if (speed) parts.push("+" + speed + " " + t("speed"));
    } else { S.streak = 0; }
    S.score += gain; S.results[S.i] = ok;

    document.querySelectorAll(".choice").forEach(function (b) {
      b.disabled = true;
      if (b.dataset.v === truth) b.classList.add("right");
      else if (b === btn) b.classList.add("wrong");
    });
    var expl = S.mode === "sit" ? it.why[L] : it[L];
    var html = '<div class="feedback ' + (ok ? "ok" : "ko") + '"><h3>' + esc(ok ? t("right") : t("wrong")) +
      (ok ? ' <span class="gain">+' + gain + " " + esc(t("pts")) + (parts.length ? " (" + esc(parts.join(", ")) + ")" : "") + "</span>" : "") + "</h3>";
    if (S.mode !== "sit") {
      var lp = $("#loupe"); if (lp) lp.classList.add("revealed");
      html += '<p class="legend">' + esc(t("legend")) + " <b>" + esc(it.reg) + "</b></p>";
    }
    html += "<p>" + esc(expl) + "</p>";
    if (S.mode === "duel") {
      var aiPhish = it.ai >= D.aiThreshold, aiOk = (aiPhish ? "phish" : "legit") === it.truth;
      if (aiOk) S.aiCorrect++;
      html += '<div class="ai"><strong>' + esc(t("aiSays")) + "</strong><span>" + esc(aiPhish ? t("aiPhish") : t("aiLegit")) + " (" + it.ai.toFixed(2) + ") · " +
        esc(aiOk ? t("aiRight") : t("aiWrong")) + '</span><div class="meter" aria-hidden="true"><i style="width:' + (it.ai * 100).toFixed(1) + '%"></i><b style="left:' +
        (D.aiThreshold * 100).toFixed(1) + '%"></b></div><small>' + esc(t("aiNote")) + "</small></div>";
    }
    var last = S.i === S.items.length - 1;
    html += '<button type="button" class="next" id="next">' + esc(last ? t("finish") : t("next")) + "</button></div>";
    $("#fb").innerHTML = html;
    hud(true);
    $("#next").addEventListener("click", function () { S.i++; if (S.i < S.items.length) renderQuestion(); else finish(); });
    $("#next").focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ fin
  function finish() {
    var n = S.items.length, acc = S.correct / n, b = beltIndex(acc);
    var scores = load("pd.scores", []);
    scores.push({ name: S.name || t("defaultName"), avatar: S.avatar, score: S.score, belt: b, mode: S.mode, at: Date.now() });
    scores.sort(function (x, y) { return y.score - x.score; });
    save("pd.scores", scores.slice(0, 20));
    S.last = { acc: acc, belt: b, n: n };
    renderEnd(true);
  }

  function renderEnd(animate) {
    hud(false);
    var r = S.last, n = r.n;
    var stats = [
      [S.score, t("score")], [S.correct + "/" + n, t("correct")], [Math.round(r.acc * 100) + " %", t("accuracy")], [S.best, t("best")]
    ];
    if (S.mode === "duel") stats.push([S.correct + " – " + S.aiCorrect, t("youVsAi")]);
    var share = t("shareTxt")(t("belts")[r.belt], S.score, S.correct, n);
    $("#screen").innerHTML =
      '<section class="end"><div class="belt-card' + (animate ? " pop" : "") + '"><p class="muted" style="margin:0">' + esc(S.name || t("defaultName")) + "</p>" +
      '<p class="grade">' + esc(t("grade")(t("belts")[r.belt])) + "</p>" + beltSvg(r.belt) + "</div>" +
      '<div class="stats">' + stats.map(function (s) { return '<div class="stat"><b>' + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></div>"; }).join("") + "</div>" +
      '<div class="share"><h2 style="margin:0;font-size:18px">' + esc(t("shareH")) + '</h2><textarea id="shareTxt" readonly>' + esc(share) + "</textarea>" +
      '<div class="row"><button type="button" class="next" id="copy">' + esc(t("copy")) + '</button><button type="button" class="ghost" id="again">' + esc(t("again")) +
      '</button><button type="button" class="ghost" id="home">' + esc(t("home")) + "</button></div></div>" +
      '<div class="block"><h2>' + esc(t("resources")) + "</h2>" + resourcesList() + "</div></section>";
    $("#copy").addEventListener("click", function () {
      var txt = $("#shareTxt").value, btn = $("#copy");
      var done = function () { btn.textContent = t("copied"); };
      var fail = function () { $("#shareTxt").select(); btn.textContent = t("copyFail"); };
      try { navigator.clipboard.writeText(txt).then(done, fail); } catch (e) { fail(); }
    });
    $("#again").addEventListener("click", function () { start(S.mode); });
    $("#home").addEventListener("click", renderHome);
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ demarrage
  $("#lang-fr").addEventListener("click", function () { setLang("fr"); });
  $("#lang-en").addEventListener("click", function () { setLang("en"); });
  $("#theme").addEventListener("click", function () { setTheme(S.theme === "dark" ? "light" : "dark"); });
  setTheme(S.theme);
  setLang(S.lang);
})();
