/* PhishDojo Senegal - s'entrainer sur des situations locales. Tout reste dans le navigateur. */
(function () {
  "use strict";
  var P = window.PDS;
  var T = P.T, esc = P.esc;
  var SIT = window.PDS_SITUATIONS || [];
  var $ = function (s) { return document.querySelector(s); };
  var S = { i: 0, bons: 0, repondu: null, ordre: [] };

  function lng() { return P.langue(); }
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k]; }); }

  function melanger(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = a.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1));
      var x = a[j]; a[j] = a[r]; a[r] = x;
    }
    return a;
  }

  function rendre() {
    var t = T(), L = lng();
    if ($("#jeu").hidden && $("#fin").hidden) return;
    if (!$("#fin").hidden) return rendreFin();
    var s = SIT[S.ordre[S.i]];
    $("#prog-txt").textContent = fmt(t.apProgress, { n: S.i + 1, total: SIT.length });
    $("#prog-bar").style.width = Math.round((S.i / SIT.length) * 100) + "%";
    $("#scene").textContent = s.scene[L];
    $("#choices").innerHTML = s.choix.map(function (c, k) {
      var cls = "";
      if (S.repondu !== null) cls = k === s.bonne ? " good" : (k === S.repondu ? " bad" : "");
      return '<button type="button" class="choice' + cls + '" data-k="' + k + '"' + (S.repondu !== null ? " disabled" : "") + ">" + esc(c[L]) + "</button>";
    }).join("");
    var v = $("#verdict");
    if (S.repondu === null) { v.hidden = true; $("#next").hidden = true; return; }
    var ok = S.repondu === s.bonne;
    v.hidden = false;
    v.className = "verdict " + (ok ? "good" : "bad");
    $("#v-titre").textContent = ok ? t.apGood : t.apBad;
    $("#v-why").textContent = s.pourquoi[L];
    $("#v-methode").textContent = t.apMethod + " : " + s.methode[L];
    $("#next").hidden = false;
    $("#next").textContent = S.i + 1 < SIT.length ? t.apNext : t.apEnd;
  }

  function rendreFin() {
    var t = T();
    $("#score").textContent = S.bons + " / " + SIT.length;
    var ratio = S.bons / SIT.length;
    $("#grade").textContent = fmt(t.apScore, { n: S.bons, total: SIT.length }) + ". " + t.apGrade[ratio >= 0.85 ? 2 : ratio >= 0.6 ? 1 : 0];
  }

  function demarrer() {
    S = { i: 0, bons: 0, repondu: null, ordre: melanger(SIT.length) };
    $("#intro").hidden = true;
    $("#fin").hidden = true;
    $("#jeu").hidden = false;
    rendre();
    $("#jeu").scrollIntoView({ block: "start" });
  }

  $("#choices").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]");
    if (!b || S.repondu !== null) return;
    S.repondu = Number(b.getAttribute("data-k"));
    if (S.repondu === SIT[S.ordre[S.i]].bonne) S.bons++;
    rendre();
    $("#next").focus();
  });
  $("#next").addEventListener("click", function () {
    if (S.i + 1 < SIT.length) { S.i++; S.repondu = null; rendre(); $("#scene").scrollIntoView({ block: "center" }); return; }
    $("#prog-bar").style.width = "100%";
    $("#jeu").hidden = true;
    $("#fin").hidden = false;
    rendreFin();
  });
  $("#start").addEventListener("click", demarrer);
  $("#restart").addEventListener("click", demarrer);

  P.surLangue(rendre);
  P.demarrer();
})();
