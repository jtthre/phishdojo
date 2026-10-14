/* PhishDojo - bande-annonce. Animation deterministe : tout est dessine par draw(t),
   ce qui permet de la rejouer en direct ET de l'exporter image par image. */
(function () {
  "use strict";
  var BASE_W = 1920, BASE_H = 1080;
  var DUR = 32;                      // duree totale, secondes
  var cv = document.getElementById("stage");
  var ctx = cv.getContext("2d");

  // -------- palette (theme arcade sombre de PhishDojo)
  var C = {
    bg0: "#0A0E28", bg1: "#10163A",
    ink: "#EAF0FF", soft: "#97A2D8",
    gold: "#FFC93D", onGold: "#141A3A",
    ok: "#30D98C", ko: "#FF6586", jade: "#9FD3C7",
    grid: "#1B2350"
  };
  var F_DISP = '"Dela Gothic One", "Arial Black", Impact, sans-serif';
  var F_BODY = '"Figtree", "Segoe UI", system-ui, sans-serif';
  var F_MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';

  // -------- utilitaires
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function easeOut(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }
  function app(t, from, dur) { return easeOut((t - from) / dur); }
  function win(t, from, to, fade) {
    fade = fade || 0.5;
    return clamp((t - from) / fade, 0, 1) * clamp((to - t) / fade, 0, 1);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(s, x, y, size, font, color, align, alpha, spacing) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 " + size + "px " + font;
    if (spacing) {
      var total = 0, i;
      for (i = 0; i < s.length; i++) total += ctx.measureText(s[i]).width + spacing;
      total -= spacing;
      var sx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
      for (i = 0; i < s.length; i++) { ctx.textAlign = "left"; ctx.fillText(s[i], sx, y); sx += ctx.measureText(s[i]).width + spacing; }
    } else { ctx.fillText(s, x, y); }
    ctx.restore();
  }
  function typed(s, x, y, size, font, color, align, prog) {
    var n = Math.round(clamp(prog, 0, 1) * s.length);
    text(s.slice(0, n), x, y, size, font, color, align, 1);
  }
  // tampon incline (verdict)
  function stamp(x, y, label, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(x, y); ctx.rotate(-0.12);
    ctx.lineWidth = 5; ctx.strokeStyle = color;
    rr(-170, -46, 340, 92, 12); ctx.stroke();
    text(label, 0, 20, 50, F_DISP, color, "center", 1);
    ctx.restore();
  }

  // -------- fond commun : gradient + grille + halo
  function background(t) {
    var g = ctx.createLinearGradient(0, 0, 0, BASE_H);
    g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.save();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = C.grid; ctx.lineWidth = 1.5;
    var off = (t * 26) % 70;
    for (var yy = -70 + off; yy < BASE_H; yy += 70) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(BASE_W, yy); ctx.stroke(); }
    for (var xx = 0; xx < BASE_W; xx += 70) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, BASE_H); ctx.stroke(); }
    ctx.restore();
    var h = ctx.createRadialGradient(BASE_W / 2, 120, 40, BASE_W / 2, 120, 900);
    h.addColorStop(0, "rgba(255,201,61,0.10)"); h.addColorStop(1, "rgba(255,201,61,0)");
    ctx.fillStyle = h; ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // -------- logo (repris du jeu)
  function logo(cx, cy, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 32, s / 32);
    ctx.fillStyle = "#1B2550"; ctx.beginPath(); ctx.arc(16, 16, 15, 0, 7); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.gold; ctx.beginPath();
    ctx.moveTo(9, 17); ctx.bezierCurveTo(12, 11, 20, 10, 24, 15); ctx.bezierCurveTo(21, 16, 19, 18, 18, 21); ctx.bezierCurveTo(15, 20, 12, 19, 9, 17); ctx.fill();
    ctx.fillStyle = "#10163A"; ctx.beginPath(); ctx.arc(20, 15, 1.6, 0, 7); ctx.fill();
    ctx.restore();
  }

  // -------- une ligne URL : cadre + adresse + note
  function urlRow(x, y, w, h, url, note, border, alpha, slide) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(-slide, 0);
    ctx.fillStyle = C.bg1; rr(x, y, w, h, 22); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = border; rr(x, y, w, h, 22); ctx.stroke();
    text(url, x + 44, y + 78, 58, F_MONO, C.ink, "left", 1);
    text(note, x + 44, y + 128, 32, F_BODY, C.soft, "left", 1);
    ctx.restore();
  }

  // =====================================================================
  function draw(t) {
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    background(t);
    var cx = BASE_W / 2;
    var rw = 1240, rx = cx - rw / 2, rh = 170;

    // ---- A (0 - 4.6) : la promesse
    var a = win(t, 0, 4.6, 0.6);
    if (a > 0.001) {
      text("UN DÉTECTEUR D'URL DE PHISHING PUBLIC PROMETTAIT", cx, 400, 36, F_BODY, C.soft, "center", a, 6);
      var p = easeOut((t - 0.5) / 1.2);
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(cx, 620); ctx.scale(0.9 + 0.1 * p, 0.9 + 0.1 * p);
      text("« 97 % »", 0, 0, 200, F_DISP, C.gold, "center", a);
      ctx.restore();
      text("de précision.", cx, 760, 58, F_BODY, C.ink, "center", a);
    }

    // ---- B (4.6 - 10.6) : un modele plein de lacunes
    var b = win(t, 4.6, 10.6, 0.55);
    if (b > 0.001) {
      text("L'AUDIT A RÉVÉLÉ SES LACUNES", cx, 230, 40, F_BODY, C.soft, "center", b, 8);
      var rowsB = [
        { url: "impots.gouv.fr", note: "le vrai site des impôts", v: "BLOQUÉ", from: 5.2 },
        { url: "googIe.com", note: "un I majuscule à la place du l", v: "IGNORÉ", from: 6.4 }
      ];
      for (var i = 0; i < rowsB.length; i++) {
        var r = rowsB[i], ap = easeOut((t - r.from) / 0.7);
        if (ap <= 0) continue;
        var yy = 380 + i * (rh + 34);
        urlRow(rx, yy, rw, rh, r.url, r.note, C.ko, b * ap, (1 - ap) * 60);
        var s = easeOut((t - r.from - 0.35) / 0.4);
        if (s > 0) stamp(rx + rw - 230, yy + rh / 2, r.v, C.ko, b * ap * s);
      }
      text("Un vrai site bloqué. Une vraie imitation ignorée.", cx, 910, 38, F_BODY, C.soft, "center", b * app(t, 8.6, 0.8));
    }

    // ---- B2 (10.6 - 16.6) : alors je l'ai entraine
    var b2 = win(t, 10.6, 16.6, 0.55);
    if (b2 > 0.001) {
      text("ALORS J'AI ENTRAÎNÉ MON PROPRE MODÈLE", cx, 230, 40, F_BODY, C.gold, "center", b2, 8);
      var rowsC = [
        { url: "impots.gouv.fr", before: "1,00", after: "0,02", v: "LÉGITIME", from: 11.2 },
        { url: "googIe.com", before: "0,00", after: "0,97", v: "DÉTECTÉ", from: 12.4 }
      ];
      for (var j = 0; j < rowsC.length; j++) {
        var q = rowsC[j], aq = easeOut((t - q.from) / 0.7);
        if (aq <= 0) continue;
        var y2 = 380 + j * (rh + 34);
        // note : score du modele public barre -> score du nouveau modele
        urlRow(rx, y2, rw, rh, q.url, "", C.ok, b2 * aq, (1 - aq) * 60);
        ctx.save(); ctx.globalAlpha = b2 * aq;
        ctx.font = "600 32px " + F_BODY;
        var lbl = "modèle public : " + q.before;
        ctx.fillStyle = C.ko; ctx.textAlign = "left"; ctx.fillText(lbl, rx + 44, y2 + 128);
        var lw = ctx.measureText(lbl).width;
        var strike = clamp((t - q.from - 0.4) / 0.35, 0, 1);
        ctx.strokeStyle = C.ko; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(rx + 44, y2 + 117); ctx.lineTo(rx + 44 + lw * strike, y2 + 117); ctx.stroke();
        var aa = clamp((t - q.from - 0.8) / 0.35, 0, 1);
        ctx.globalAlpha = b2 * aq * aa;
        ctx.fillStyle = C.ok; ctx.fillText("→  le mien : " + q.after, rx + 64 + lw, y2 + 128);
        ctx.restore();
        var s2 = easeOut((t - q.from - 1.0) / 0.4);
        if (s2 > 0) stamp(rx + rw - 230, y2 + rh / 2, q.v, C.ok, b2 * aq * s2);
      }
      text("219 000 URL de phishing réelles  ·  découpe temporelle  ·  scores calibrés", cx, 910, 34, F_BODY, C.soft, "center", b2 * app(t, 14.4, 0.8));
    }

    // ---- C (16.6 - 21.2) : la vraie question
    var c = win(t, 16.6, 21.2, 0.55);
    if (c > 0.001) {
      text("ET JE L'AI MESURÉ SUR LA BONNE QUESTION", cx, 300, 38, F_BODY, C.gold, "center", c, 6);
      ctx.save(); ctx.globalAlpha = c;
      typed("À quel taux de faux positifs", cx, 480, 76, F_DISP, C.ink, "center", (t - 17.0) / 1.0);
      typed("peut-on détecter le phishing", cx, 600, 76, F_DISP, C.ink, "center", (t - 17.7) / 1.0);
      typed("qu'on n'a jamais vu ?", cx, 720, 76, F_DISP, C.gold, "center", (t - 18.5) / 0.8);
      ctx.restore();
    }

    // ---- D (21.2 - 24.8) : la reponse chiffree
    var d = win(t, 21.2, 24.8, 0.5);
    if (d > 0.001) {
      text("LA RÉPONSE, MESURÉE", cx, 300, 38, F_BODY, C.soft, "center", d, 10);
      text("80 % du phishing détecté", cx, 460, 66, F_DISP, C.jade, "center", d);
      var val = Math.round(240 * clamp(easeOut((t - 21.5) / 1.0), 0, 1));
      text("≈ " + val, cx - 30, 650, 150, F_DISP, C.gold, "right", d);
      text("alertes / jour", cx + 10, 650, 54, F_BODY, C.ink, "left", d);
      text("sur des campagnes que le modèle n'avait jamais vues", cx, 760, 36, F_BODY, C.soft, "center", d * app(t, 22.4, 0.8));
    }

    // ---- E (24.8 - 28.8) : IA x cybersecurite
    var e = win(t, 24.8, 28.8, 0.5);
    if (e > 0.001) {
      text("QUAND L'IA RENCONTRE LA CYBERSÉCURITÉ", cx, 190, 40, F_BODY, C.gold, "center", e, 6);
      var m = easeOut((t - 25.0) / 1.2);           // les deux cercles se rapprochent
      var R = 240, dx = 430 - 270 * m, cy2 = 520;
      ctx.save(); ctx.globalAlpha = e;
      ctx.fillStyle = "rgba(159,211,199,0.16)"; ctx.strokeStyle = C.jade; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx - dx, cy2, R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,201,61,0.16)"; ctx.strokeStyle = C.gold;
      ctx.beginPath(); ctx.arc(cx + dx, cy2, R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.restore();
      text("IA", cx - dx - 70, cy2 + 26, 84, F_DISP, C.jade, "center", e);
      text("Cyber", cx + dx + 70, cy2 + 22, 66, F_DISP, C.gold, "center", e);
      // au centre : ce que fait la jointure
      var mid = app(t, 26.0, 0.7);
      text("détecter", cx, cy2 - 30, 30, F_BODY, C.ink, "center", e * mid);
      text("auditer", cx, cy2 + 12, 30, F_BODY, C.ink, "center", e * mid);
      text("former", cx, cy2 + 54, 30, F_BODY, C.ink, "center", e * mid);
      text("L'IA détecte à grande échelle. La cybersécurité vérifie ce qu'elle a vraiment appris.", cx, 880, 36, F_BODY, C.soft, "center", e * app(t, 26.4, 0.8));
    }

    // ---- F (28.8 - 32) : carte de fin
    var f = win(t, 28.8, 32.4, 0.5);
    if (f > 0.001) {
      var pop = easeOut((t - 29.0) / 0.7);
      ctx.save(); ctx.font = "600 130px " + F_DISP;
      var tw = ctx.measureText("PhishDojo").width; ctx.restore();
      var lg = 150, gap = 36, total = lg + gap + tw, x0 = cx - total / 2;
      logo(x0 + lg / 2, 440, lg * (0.6 + 0.4 * pop), f);
      text("PhishDojo", x0 + lg + gap, 486, 130, F_DISP, C.ink, "left", f);
      text("Entraîne ton œil. Mesure ce que ça coûte.", cx, 610, 46, F_BODY, C.gold, "center", f);
      var belts = ["#FFFFFF", "#F2C94C", "#3BA55C", "#8B5A2B", "#1A1A1A"];
      var bw = 520, bx = cx - bw / 2, by = 690, seg = bw / belts.length;
      var bp = clamp((t - 29.4) / 1.2, 0, 1);
      for (var k = 0; k < belts.length; k++) {
        if (k / belts.length > bp) break;
        ctx.save(); ctx.globalAlpha = f; ctx.fillStyle = belts[k];
        rr(bx + k * seg, by, seg - 6, 22, 6); ctx.fill(); ctx.restore();
      }
      text("IA × Cybersécurité  ·  démo jouable  ·  code open source", cx, 800, 36, F_BODY, C.soft, "center", f * app(t, 29.8, 0.8));
      text("Mamadou Lamine Thiore", cx, 870, 34, F_MONO, C.soft, "center", f * app(t, 29.8, 0.8));
    }

    // ---- vignette
    var vg = ctx.createRadialGradient(cx, BASE_H / 2, 500, cx, BASE_H / 2, 1200);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // -------- lecture + exposition pour capture
  var raf = null, startT = 0, paused = false;
  function frame(now) {
    if (paused) return;
    var t = (now - startT) / 1000;
    if (t >= DUR) { draw(DUR - 0.001); return; }
    draw(t); raf = requestAnimationFrame(frame);
  }
  function play() {
    paused = false; if (raf) cancelAnimationFrame(raf);
    startT = performance.now(); raf = requestAnimationFrame(frame);
  }
  window.__seek = function (t) { paused = true; if (raf) cancelAnimationFrame(raf); draw(t); };
  window.__play = play;
  window.__DUR = DUR;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    var rb = document.getElementById("replay");
    if (rb) rb.addEventListener("click", play);
    if (reduce || window.__capture) draw(DUR - 0.001); else play();
  }
  if (window.__capture) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(0); }); else draw(0); }
  else if (document.fonts && document.fonts.ready) { document.fonts.ready.then(boot); setTimeout(boot, 1500); }
  else boot();
})();
