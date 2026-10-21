/* PhishDojo - page « Vérifier » : analyse les liens d'un message sur l'appareil, avec le
 * modèle exporté (web/modele/url-lgbm.js) et le moteur web/moteur-url.js.
 * Aucun envoi : la CSP de la page interdit toute connexion (connect-src 'none'), et ce
 * fichier n'utilise aucune fonction réseau. Les liens ne sont jamais rendus cliquables, et
 * les résultats sont construits élément par élément : le texte collé ne passe jamais par
 * l'analyseur HTML du navigateur (pas d'innerHTML). */
(function () {
  "use strict";

  var PDS = window.PDS;
  var moteur = null, analyses = null, tronque = false, erreur = "";
  function $(s) { return document.querySelector(s); }
  var champ = $("#texte"), bouton = $("#analyser"), etat = $("#etat"), zone = $("#resultats");

  function T() { return PDS.T(); }

  // el("p", "classe", [texte ou élément...]) : le texte devient un nœud texte, jamais du HTML
  function el(balise, classe, enfants) {
    var e = document.createElement(balise), i;
    if (classe) e.className = classe;
    for (i = 0; enfants && i < enfants.length; i++) {
      if (enfants[i] === null || enfants[i] === undefined || enfants[i] === "") continue;
      e.appendChild(typeof enfants[i] === "string" ? document.createTextNode(enfants[i]) : enfants[i]);
    }
    return e;
  }
  function decoratif(balise, classe, texte) {
    var e = el(balise, classe, texte ? [texte] : []);
    e.setAttribute("aria-hidden", "true");
    return e;
  }
  function vider(e) { while (e.firstChild) e.removeChild(e.firstChild); }

  function nombre(v, dec) { return Number(v).toFixed(dec).replace(".", ","); }
  function pourcent(v, dec) { return nombre(v * 100, dec) + " %"; }
  var maintenant = window.performance && performance.now ? function () { return performance.now(); } : function () { return Date.now(); };

  // Valeur lisible d'un attribut : oui/non pour les indicateurs, l'extension pour le TLD
  var BINAIRES = /^(ip_litterale|port_explicite|arobase|double_barre_chemin|extension_php|hebergeur_gratuit|raccourcisseur|hote_majuscule|punycode|non_ascii|squelette_marque|marque_hors_domaine|domaine_dans_sous_domaine)$/;
  // texte tiré de la saisie : caractères invisibles et de sens d'écriture rendus visibles
  function visible(s) { return window.PDS_MOTEUR_URL.rendreVisible(s); }

  function valeur(a, nom, t) {
    if (nom === "tld") return a.tld ? "." + visible(a.tld) : "—";
    var v = a.attributs[nom];
    if (BINAIRES.test(nom)) return v ? t.vfOui : t.vfNon;
    return Number(v) === Math.round(v) ? String(v) : nombre(v, 2);
  }

  // Précision affichée à côté d'une raison : la marque citée, la destination cachée
  function precision(a, nom, t) {
    if (nom === "marque_hors_domaine" && a.details.marqueCitee) return a.details.marqueCitee;
    if (nom === "raccourcisseur" && a.attributs.raccourcisseur) return t.vfCache;
    return "";
  }

  // Trois niveaux publics, sur les seuils fixés en validation : « 80 % de rappel » (0,45 % de
  // faux positifs au test) et « 90 % » (2,7 %). Le seuil « 95 % » (11 % au test) n'apparaît que
  // dans les détails pour analyste (ml/reports/rapport.md).
  function niveauPublic(a) { return a.niveau === 3 ? 3 : (a.niveau === 2 ? 2 : 0); }
  function texteNiveau(n, t) {
    if (n === 3) return { cle: "n3", titre: t.vfN3, texte: t.vfN3d, conseil: t.vfConseil3 };
    if (n === 2) return { cle: "n1", titre: t.vfN1, texte: t.vfN1d, conseil: t.vfConseil1 };
    return { cle: "n0", titre: t.vfN0, texte: t.vfN0d, conseil: t.vfConseil0 };
  }

  // Raisons pour le grand public : libellé et valeur (« Lien raccourci : non »), pour qu'un
  // signal absent ne soit jamais lu comme présent. Les trois attributs de ressemblance avec
  // une marque tiennent en une ligne.
  var MARQUE = /^(squelette_marque|distance_marque|distance_marque_rel)$/;
  function raisonsPubliques(a, t) {
    // au-dessus du seuil : ce qui pousse vers l'arnaque ; sinon : les poids les plus forts
    var liste = niveauPublic(a) > 0 ? a.raisons.filter(function (r) { return r.contribution > 0; }) : a.raisons;
    var vus = {}, ul = el("ul", "vf-raisons"), n = 0, i;
    for (i = 0; i < liste.length && n < 3; i++) {
      var r = liste[i], cle = MARQUE.test(r.nom) ? "marque" : r.nom, libelle, val;
      if (vus[cle]) continue;
      vus[cle] = true;
      if (cle === "marque") {
        var dist = a.attributs.distance_marque, proche = a.details.marqueProche;
        libelle = t.vfMarque;
        val = proche && dist <= 3 ? (dist === 0 ? t.vfMarqueIdentique : t.vfMarqueEcart.replace("{n}", String(dist))) + " " + proche : t.vfMarqueAucune;
      } else {
        var p = precision(a, r.nom, t);
        libelle = t.attr[r.nom];
        val = valeur(a, r.nom, t) + (p ? " — " + p : "");
      }
      var vers = r.contribution > 0;
      ul.appendChild(el("li", vers ? "vf-haut" : "vf-bas", [
        decoratif("span", "vf-fleche", vers ? "↑" : "↓"),
        el("span", "", [libelle + " : ", el("span", "vf-precision", [val]), " ", el("span", "sr-only", ["(" + (vers ? t.vfVersArnaque : t.vfVersLegitime) + ")"])])
      ]));
      n++;
    }
    return ul;
  }

  function table(classe, entetes, lignes) {
    var tbody = el("tbody", "", []), i;
    for (i = 0; i < lignes.length; i++) tbody.appendChild(lignes[i]);
    var tab = el("table", "vf-table" + (classe ? " " + classe : ""), []);
    if (entetes) tab.appendChild(el("thead", "", [el("tr", "", entetes.map(function (h) { return el("th", "", [h]); }))]));
    tab.appendChild(tbody);
    return tab;
  }
  function defile(contenu) { return el("div", "vf-defile", [contenu]); }
  function ligne(cle, val) {
    var th = el("th", "", [cle]);
    th.setAttribute("scope", "row");
    return el("tr", "", [th, el("td", "", [val])]);
  }

  function detailsAnalyste(a, t, D, desamorcer) {
    var d = a.decoupe, mes = D.mesures;
    var seuils = mes.seuils.map(function (m) {
      var atteint = a.proba >= m.seuil;
      return el("tr", atteint ? "vf-atteint" : "", [
        el("td", "", [nombre(m.seuil, 4)]),
        el("td", "", [pourcent(m.cible, 0) + " → " + pourcent(m.rappel, 1)]),
        el("td", "", [pourcent(m.tfp, 2) + " ", el("span", "vf-ic", ["[" + pourcent(m.tfp_bas, 2) + " – " + pourcent(m.tfp_haut, 2) + "]"])]),
        el("td", "", [atteint ? t.vfOui : t.vfNon])
      ]);
    });
    var attributs = a.raisons.map(function (r) {
      return el("tr", "", [
        el("td", "", [t.attr[r.nom] + " ", el("code", "", [r.nom])]),
        el("td", "", [valeur(a, r.nom, t)]),
        el("td", r.contribution > 0 ? "vf-pos" : "vf-neg", [(r.contribution > 0 ? "+" : "") + nombre(r.contribution, 3)])
      ]);
    });
    var code = Object.prototype.hasOwnProperty.call(D.vocab_tld, a.tld) ? D.vocab_tld[a.tld] : 0;
    var decoupage = [ligne(t.vfHote, desamorcer(d[0]) || "—")];
    if (d[1] !== d[0] && d[1] !== d[0].toLowerCase()) decoupage.push(ligne(t.vfHoteAff, desamorcer(d[1])));
    decoupage.push(ligne(t.vfDomaine, desamorcer(d[4]) || "—"), ligne(t.vfSous, desamorcer(d[5]) || "—"),
      ligne(t.vfSuffixe, visible(d[6]) || "—"), ligne(t.vfPrive, d[7] ? t.vfOui : t.vfNon),
      ligne(t.vfTld, (a.tld ? "." + visible(a.tld) : "—") + " → " + code));
    var provenance = t.vfModele.replace("{n}", String(D.arbres.length)).replace("{date}", D.provenance.entraine_le)
      .replace("{auc}", nombre(mes.auc, 3)).replace("{sha}", D.provenance.modele_sha256.slice(0, 12));
    return el("details", "vf-analyste", [
      el("summary", "", [t.vfAnalyste]),
      table("", null, [ligne(t.vfScore, nombre(a.proba, 4)), ligne(t.vfBrut, nombre(a.brut, 4)),
        ligne(t.vfBase, nombre(a.base, 4)), ligne(t.vfTemps, nombre(a.ms, 1) + " ms")]),
      el("h4", "", [t.vfSeuils]),
      defile(table("", [t.vfSeuilCol, t.vfRappelCol, t.vfFpCol, t.vfAtteintCol], seuils)),
      el("h4", "", [t.vfDecoupage]),
      defile(table("vf-mono", null, decoupage)),
      el("h4", "", [t.vfAttributs]),
      defile(table("", [t.vfAttrCol, t.vfValCol, t.vfContribCol], attributs)),
      el("p", "vf-provenance", [provenance])
    ]);
  }

  function carte(a, i, total, t, D, desamorcer) {
    var n = texteNiveau(niveauPublic(a), t), lien = null;
    if (niveauPublic(a) > 0) {
      lien = el("a", "btn", [t.vfSignaler]);
      lien.href = "signaler.html";
    }
    return el("article", "card vf-resultat vf-" + n.cle, [
      el("div", "vf-entete", [el("span", "mono", [t.vfLien + " " + (i + 1) + " / " + total]), el("p", "vf-url", [desamorcer(a.url)])]),
      el("div", "vf-verdict", [el("strong", "", [decoratif("span", "vf-pastille"), n.titre]), el("span", "", [n.texte])]),
      el("p", "vf-proprio", [el("span", "mono", [t.vfProprio]), el("code", "", [desamorcer(a.decoupe[4] || a.decoupe[0] || "—")])]),
      el("div", "", [el("h3", "mono vf-sous-titre", [t.vfPese]), raisonsPubliques(a, t)]),
      el("p", "vf-conseil", [n.conseil]),
      // angle mort mesuré : le phishing hébergé en .sn (ml/reports/reentrainement_sn.md)
      /(^|\.)sn$/.test(a.decoupe[6] || "") ? el("p", "note", [t.vfNoteSn]) : null,
      lien ? el("div", "row", [lien]) : null,
      detailsAnalyste(a, t, D, desamorcer)
    ]);
  }

  function rendre() {
    var t = T(), D = window.PDS_MODELE_URL, desamorcer = window.PDS_MOTEUR_URL ? window.PDS_MOTEUR_URL.desamorcer : null, i;
    var limites = $("#limites");
    vider(limites);
    for (i = 0; i < t.vfLimites.length; i++) limites.appendChild(el("li", "", [t.vfLimites[i]]));
    vider(zone);
    if (erreur) { zone.appendChild(el("p", "error", [t[erreur]])); return; }
    if (!analyses) return;
    if (!analyses.length) { zone.appendChild(el("p", "note", [t.vfAucunLien])); return; }
    if (tronque) zone.appendChild(el("p", "note", [t.vfTrop]));
    for (i = 0; i < analyses.length; i++) zone.appendChild(carte(analyses[i], i, analyses.length, t, D, desamorcer));
  }

  function analyser() {
    erreur = "";
    var texte = champ.value;
    if (!moteur) return;
    if (!/\S/.test(texte)) { analyses = null; erreur = "vfErrVide"; rendre(); champ.focus(); return; }
    try {
      var liens = moteur.extraireLiens(texte, 10);
      tronque = !!liens.tronque;
      analyses = liens.map(function (u) {
        var debut = maintenant(), a = moteur.analyser(u);
        a.ms = maintenant() - debut;
        return a;
      });
    } catch (e) {
      // jamais d'ancien résultat sous un nouveau texte
      analyses = null;
      erreur = "vfErrAnalyse";
    }
    rendre();
    // le lecteur d'écran annonce le premier résultat
    var premier = zone.querySelector(".vf-resultat, .note, .error");
    if (premier) { premier.setAttribute("tabindex", "-1"); premier.focus(); }
  }

  bouton.addEventListener("click", analyser);
  // les résultats affichés correspondent toujours au texte du champ
  champ.addEventListener("input", function () {
    if (!moteur) return; // sans modèle, l'erreur de chargement reste affichée
    if (analyses || erreur) {
      analyses = null;
      erreur = "";
      rendre();
    }
  });
  $("#effacer").addEventListener("click", function () {
    champ.value = "";
    analyses = null;
    erreur = "";
    rendre();
    champ.focus();
  });

  PDS.demarrer();
  bouton.disabled = true;
  etat.textContent = T().vfChargement;

  // Le modèle et le moteur sont chargés en différé : prêts à DOMContentLoaded
  function pret() {
    try {
      moteur = window.PDS_MOTEUR_URL.creer(window.PDS_MODELE_URL);
    } catch (e) {
      erreur = "vfErrModele";
      etat.textContent = "";
      rendre();
      return;
    }
    bouton.disabled = false;
    etat.textContent = "";
    // Préchauffage pendant que la page est inactive : le navigateur compile le moteur une
    // fois, et la première vraie analyse est rapide même sur un téléphone d'entrée de gamme.
    var prechauffer = function () {
      moteur.analyser("https://exemple.com/connexion");
      document.body.setAttribute("data-moteur", "pret");
    };
    if (window.requestIdleCallback) window.requestIdleCallback(prechauffer, { timeout: 2000 });
    else setTimeout(prechauffer, 300);
  }
  PDS.surLangue(function () {
    if (!moteur && !erreur) etat.textContent = T().vfChargement;
    rendre();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pret);
  else pret();
})();
