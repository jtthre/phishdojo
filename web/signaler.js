/* PhishDojo Senegal - page de signalement.
 * Tout le traitement du message (lecture de capture, masquage) se fait dans le navigateur.
 * Seul le texte masque et quelques champs de contexte partent vers la base. */
(function () {
  "use strict";

  var CFG = window.PDS_CONFIG || {};
  var M = window.Masquage;
  var P = window.PDS;
  var T = P.T, esc = P.esc;
  var EN_LIGNE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  var $ = function (s) { return document.querySelector(s); };
  var S = { manuels: [], selection: "", dernier: null };

  // ------------------------------------------------------------------ textes propres a la page
  function options(sel, dico, valeur) {
    sel.innerHTML = Object.keys(dico).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === valeur ? " selected" : "") + ">" + esc(dico[k]) + "</option>";
    }).join("");
  }

  function rendrePage(t) {
    var canal = (document.querySelector('input[name="canal"]:checked') || {}).value || "sms";
    $("#canaux").innerHTML = Object.keys(t.canaux).map(function (k) {
      return '<label><input type="radio" name="canal" value="' + esc(k) + '"' + (k === canal ? " checked" : "") + "><span>" + esc(t.canaux[k]) + "</span></label>";
    }).join("");
    options($("#marque"), t.marques, $("#marque").value);
    options($("#langue"), t.langues, $("#langue").value);
    options($("#mode"), t.modes, $("#mode").value);
    $("#privacy").innerHTML = t.privacy.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    rendreApercu();
  }

  // ------------------------------------------------------------------ masquage et apercu
  function calculer() {
    var auto = M.masquer($("#msg").value);
    var texte = S.manuels.reduce(function (t, extrait) { return M.masquerExtrait(t, extrait); }, auto.texte);
    return { texte: texte.trim(), domaines: auto.domaines, version: auto.version };
  }

  function rendreApercu() {
    var r = calculer();
    S.dernier = r;
    var p = $("#preview");
    if (!r.texte) {
      p.classList.add("empty");
      p.textContent = T().previewEmpty;
    } else {
      p.classList.remove("empty");
      p.innerHTML = esc(r.texte).replace(/\[(NUMÉRO|MONTANT|RÉFÉRENCE|CODE|E-MAIL|NOM|PARAMÈTRES|MASQUÉ)\]/g, "<mark>[$1]</mark>");
    }
    var d = $("#domains");
    if (r.domaines.length) {
      d.hidden = false;
      d.innerHTML = esc(T().domains) + " " + r.domaines.map(function (x) { return "<code>" + esc(x) + "</code>"; }).join("");
    } else {
      d.hidden = true;
    }
    $("#undo").disabled = S.manuels.length === 0;
  }

  // On garde la derniere selection faite DANS l'apercu : sur mobile, toucher le bouton peut l'effacer.
  document.addEventListener("selectionchange", function () {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var n = sel.anchorNode;
    if (n && $("#preview").contains(n)) {
      var txt = sel.toString().trim();
      if (txt) S.selection = txt;
    }
  });

  $("#mask-sel").addEventListener("mousedown", function (e) { e.preventDefault(); });
  $("#mask-sel").addEventListener("click", function () {
    var sel = (window.getSelection() && window.getSelection().toString().trim()) || S.selection;
    if (sel && sel.length >= 2 && S.dernier && S.dernier.texte.indexOf(sel) >= 0) {
      S.manuels.push(sel);
      S.selection = "";
      rendreApercu();
    }
  });
  $("#undo").addEventListener("click", function () { S.manuels.pop(); rendreApercu(); });
  $("#msg").addEventListener("input", rendreApercu);

  // ------------------------------------------------------------------ lecture de capture (OCR local)
  // Tout est servi par le site lui-meme (web/vendor, copie depuis npm) : aucun CDN, l'image
  // reste dans le navigateur.
  var ocr = null;
  function chargerScript(src) {
    return new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = ok;
      s.onerror = function () { ko(new Error(src)); };
      document.head.appendChild(s);
    });
  }
  function moteurOcr() {
    if (ocr) return ocr;
    ocr = (window.Tesseract ? Promise.resolve() : chargerScript("vendor/tesseract/tesseract.min.js"))
      .then(function () {
        return window.Tesseract.createWorker("fra", 1, {
          workerPath: "vendor/tesseract/worker.min.js",
          corePath: "vendor/tesseract/core",
          langPath: "vendor/tesseract/lang",
          workerBlobURL: false,
          gzip: true,
          cacheMethod: "none"
        });
      })
      .catch(function (e) { ocr = null; throw e; });
    return ocr;
  }

  $("#shot-btn").addEventListener("click", function () { $("#shot").click(); });
  $("#shot").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var st = $("#ocr-status");
    if (!/^image\/(png|jpe?g|webp|gif|bmp)$/.test(f.type) || f.size > 10 * 1024 * 1024) { st.textContent = T().ocrFail; return; }
    st.textContent = T().ocrLoading;
    moteurOcr()
      .then(function (w) { return w.recognize(f); })
      .then(function (res) {
        var texte = (res && res.data && res.data.text || "").replace(/\n{3,}/g, "\n\n").trim();
        if (!texte) throw new Error("vide");
        $("#msg").value = ($("#msg").value ? $("#msg").value + "\n" : "") + texte.slice(0, 4000);
        st.textContent = T().ocrDone;
        rendreApercu();
      })
      .catch(function () { st.textContent = T().ocrFail; });
  });

  // ------------------------------------------------------------------ envoi
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.from(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  function erreur(msg) {
    var e = $("#err");
    e.textContent = msg || "";
    e.hidden = !msg;
  }

  function api(chemin, corps) {
    return fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + chemin, {
      method: "POST",
      headers: {
        "apikey": CFG.supabaseAnonKey,
        "Authorization": "Bearer " + CFG.supabaseAnonKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(corps),
      referrerPolicy: "no-referrer",
      credentials: "omit"
    });
  }

  $("#send").addEventListener("click", function () {
    var t = T();
    var r = calculer();
    // seconde passe : le masquage est idempotent, on le reapplique sur le texte final
    var texte = M.masquer(r.texte).texte;
    if (texte.length < 10) return erreur(t.errShort);
    if (texte.length > 2000) return erreur(t.errLong);
    if (!$("#consent").checked || !$("#adult").checked) return erreur(t.errBoxes);
    erreur("");

    var exp = M.normaliserNumero($("#exp").value);
    var charge = {
      id: uuid(),
      canal: (document.querySelector('input[name="canal"]:checked') || {}).value || "autre",
      marque: $("#marque").value || null,
      langue: $("#langue").value || null,
      mode: $("#mode").value || null,
      recu_le: $("#recu").value || null,
      texte: texte,
      domaines: r.domaines.slice(0, 20),
      expediteur: exp || null,
      version_masquage: r.version
    };

    // champ piege rempli = robot : on fait semblant d'accepter, sans rien envoyer
    if ($("#site").value) return terminer(charge, false);

    if (!EN_LIGNE) return terminer(charge, true);

    var b = $("#send");
    b.disabled = true;
    b.textContent = t.sending;
    api("signalements", charge)
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        terminer(charge, false);
      })
      .catch(function () { erreur(t.errNet); })
      .then(function () { b.disabled = false; b.textContent = T().send; });
  });

  function terminer(charge, demo) {
    $("#form-view").hidden = true;
    $("#done-view").hidden = false;
    $("#report-id").textContent = charge.id;
    $("#demo-note").hidden = !demo;
    $("#demo-json").hidden = !demo;
    if (demo) {
      var montre = Object.assign({}, charge);
      if (montre.expediteur) montre.expediteur = montre.expediteur + "  (→ empreinte HMAC côté serveur, puis effacé)";
      $("#demo-json").textContent = JSON.stringify(montre, null, 2);
    }
    $("#done-view").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#copy").addEventListener("click", function () {
    var id = $("#report-id").textContent;
    var b = $("#copy");
    Promise.resolve()
      .then(function () { return navigator.clipboard.writeText(id); })
      .then(function () { b.textContent = T().copied; })
      .catch(function () {
        var range = document.createRange();
        range.selectNodeContents($("#report-id"));
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(range);
      });
  });

  $("#again").addEventListener("click", function () {
    $("#msg").value = ""; $("#exp").value = ""; $("#mode").value = "";
    $("#consent").checked = false; $("#adult").checked = false;
    S.manuels = [];
    $("#copy").textContent = T().copy;
    $("#done-view").hidden = true;
    $("#form-view").hidden = false;
    rendreApercu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ------------------------------------------------------------------ suppression
  $("#del").addEventListener("click", function () {
    var id = $("#del-id").value.trim();
    var st = $("#del-status");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { st.textContent = T().delNo; return; }
    if (!EN_LIGNE) { st.textContent = T().delDemo; return; }
    fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/supprimer_signalement", {
      method: "POST",
      headers: { "apikey": CFG.supabaseAnonKey, "Authorization": "Bearer " + CFG.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
      referrerPolicy: "no-referrer",
      credentials: "omit"
    })
      .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
      .then(function (ok) { st.textContent = ok ? T().delOk : T().delNo; })
      .catch(function () { st.textContent = T().errNet; });
  });

  // ------------------------------------------------------------------ demarrage
  var auj = new Date();
  var iso = new Date(auj.getTime() - auj.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $("#recu").value = iso;
  $("#recu").max = iso;
  $("#recu").min = "2020-01-01";
  $("#test-banner").hidden = !CFG.modeTest;

  P.surLangue(rendrePage);
  P.demarrer();
})();
