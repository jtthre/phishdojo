/* PhishDojo - moteur du vérificateur de liens.
 *
 * Reproduit dans le navigateur, à l'identique, le modèle d'URL entraîné en Python :
 * les 31 attributs de ml/features.py (avec le découpage de urllib, tldextract, ipaddress et
 * le codec idna de Python), les arbres LightGBM, la calibration de Platt et les
 * contributions SHAP. Les données viennent de web/modele/url-lgbm.js (ml/exporter_web.py).
 * tests/parite.test.js compare chaque valeur à celle calculée par Python.
 *
 * Fonctions pures sur des chaînes : aucun accès au réseau, au stockage ni à la page.
 * Python compte les chaînes en points de code, JavaScript en unités UTF-16 : les longueurs
 * et les parcours passent par pointsDeCode(). */
(function () {
  "use strict";

  var aPropre = Object.prototype.hasOwnProperty;
  var CHARS_SCHEMA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.";
  var RE_SCHEMA = /^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//;
  var RE_IPV4_TLDEXTRACT = /^(?:(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
  var RE_DANS_SOUS = /\.(com|fr|net|org|gouv|co)(\.|(?=\n?$))/; // le « $ » de Python accepte un \n final
  var RE_IPVFUTUR = /^v[a-fA-F0-9]+\.[^\n]+$/;
  var HEX = "0123456789ABCDEFabcdef";
  var CHIFFRES_PUNY = "abcdefghijklmnopqrstuvwxyz0123456789";

  // float32 : Math.fround (ES2015) ou, sur les navigateurs plus anciens, un Float32Array
  var fround = Math.fround || (function () {
    var t = new Float32Array(1);
    return function (x) { t[0] = x; return t[0]; };
  })();
  var log2 = Math.log2 || function (x) { return Math.log(x) / Math.LN2; };

  function Erreur(m) { this.message = m; }

  // ------------------------------------------------------------------ chaînes

  function pointsDeCode(s) {
    var out = [], i, c, d;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
        d = s.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { out.push((c - 0xD800) * 0x400 + d - 0xDC00 + 0x10000); i++; continue; }
      }
      out.push(c);
    }
    return out;
  }

  function depuisPoints(cps) {
    var out = "", i, c;
    for (i = 0; i < cps.length; i++) {
      c = cps[i];
      if (c >= 0x10000) { c -= 0x10000; out += String.fromCharCode(0xD800 + (c >> 10), 0xDC00 + (c & 0x3FF)); }
      else out += String.fromCharCode(c);
    }
    return out;
  }

  function longueur(s) { return pointsDeCode(s).length; }
  function commencePar(s, p) { return s.slice(0, p.length) === p; }
  function compter(s, sous) { return s.split(sous).length - 1; }
  function estAscii(s) { return !/[^\x00-\x7f]/.test(s); }
  function contient(s, sous) { return s.indexOf(sous) >= 0; }

  // str.partition(sep) et str.rsplit(sep, 1)[-1]
  function partition(s, sep) {
    var i = s.indexOf(sep);
    return i < 0 ? [s, "", ""] : [s.slice(0, i), sep, s.slice(i + sep.length)];
  }
  function apresDernier(s, sep) {
    var i = s.lastIndexOf(sep);
    return i < 0 ? s : s.slice(i + sep.length);
  }

  function cle(k) { return ":" + k; } // clés de dictionnaire sans collision avec __proto__

  // ------------------------------------------------------------ tables Unicode

  // Liste plate [écart, longueur, écart, longueur...] -> ensemble interrogé par dichotomie
  function Ensemble(plat) {
    var fin = -1, i, d;
    this.debuts = [];
    this.fins = [];
    for (i = 0; i < plat.length; i += 2) {
      d = fin + 1 + plat[i];
      fin = d + plat[i + 1] - 1;
      this.debuts.push(d);
      this.fins.push(fin);
    }
  }
  Ensemble.prototype.a = function (cp) {
    var bas = 0, haut = this.debuts.length - 1, m;
    while (bas <= haut) {
      m = (bas + haut) >> 1;
      if (cp < this.debuts[m]) haut = m - 1;
      else if (cp > this.fins[m]) bas = m + 1;
      else return true;
    }
    return false;
  };

  // Comportement des chaînes du Python d'entraînement, quel que soit l'Unicode du navigateur
  function Unicode(U) {
    var s = U.minuscules.suites, i;
    this.mDebut = []; this.mNombre = []; this.mPas = []; this.mDec = [];
    for (i = 0; i < s.length; i += 4) {
      this.mDebut.push(s[i]); this.mNombre.push(s[i + 1]); this.mPas.push(s[i + 2]); this.mDec.push(s[i + 3]);
    }
    this.mMulti = Object.create(null);
    for (i = 0; i < U.minuscules.multiples.length; i++) this.mMulti[U.minuscules.multiples[i][0]] = U.minuscules.multiples[i][1];
    this.chiffre = new Ensemble(U.chiffre);
    this.decimal = new Ensemble(U.decimal);
    this.majuscule = new Ensemble(U.majuscule);
    this.mot = new Ensemble(U.mot);
    this.espace = new Ensemble(U.espace);
    this.sigmaIgnorable = new Ensemble(U.sigma_ignorable);
    this.sigmaCasse = new Ensemble(U.sigma_casse);
    this.nfkcNetloc = new Ensemble(U.nfkc_netloc);
    this.idnaRejet = new Ensemble(U.idna2003.rejet);
    this.idnaD1 = new Ensemble(U.idna2003.d1);
    this.idnaD2 = new Ensemble(U.idna2003.d2);
    this.idnaCompose = new Ensemble(U.idna2003.compose);
  }

  // str.lower() d'un point de code isolé (hors sigma majuscule) : nombre ou chaîne
  Unicode.prototype.minuscule = function (cp) {
    if (cp < 0x80) return cp >= 0x41 && cp <= 0x5A ? cp + 32 : cp;
    if (this.mMulti[cp] !== undefined) return this.mMulti[cp];
    var bas = 0, haut = this.mDebut.length - 1, m, fin;
    while (bas <= haut) {
      m = (bas + haut) >> 1;
      if (cp < this.mDebut[m]) { haut = m - 1; continue; }
      fin = this.mDebut[m] + (this.mNombre[m] - 1) * this.mPas[m];
      if (cp > fin) { bas = m + 1; continue; }
      return (cp - this.mDebut[m]) % this.mPas[m] === 0 ? cp + this.mDec[m] : cp;
    }
    return cp;
  };

  // str.lower(), règle du sigma final comprise
  Unicode.prototype.lower = function (s) {
    if (estAscii(s)) return s.toLowerCase();
    var a = pointsDeCode(s), out = [], i, j, m, final;
    for (i = 0; i < a.length; i++) {
      if (a[i] === 0x3A3) {
        for (j = i - 1; j >= 0 && this.sigmaIgnorable.a(a[j]); j--) { /* remonte */ }
        final = j >= 0 && this.sigmaCasse.a(a[j]);
        if (final && i + 1 < a.length) {
          for (j = i + 1; j < a.length && this.sigmaIgnorable.a(a[j]); j++) { /* avance */ }
          final = j === a.length || !this.sigmaCasse.a(a[j]);
        }
        out.push(final ? 0x3C2 : 0x3C3);
        continue;
      }
      m = this.minuscule(a[i]);
      if (typeof m === "number") out.push(m);
      else out = out.concat(pointsDeCode(m));
    }
    return depuisPoints(out);
  };

  // str.isdigit(), str.isdecimal()... : vrai si non vide et tous les caractères y sont
  Unicode.prototype.tous = function (s, ens) {
    var a = pointsDeCode(s), i;
    if (!a.length) return false;
    for (i = 0; i < a.length; i++) if (!ens.a(a[i])) return false;
    return true;
  };

  Unicode.prototype.compte = function (s, ens) {
    var a = pointsDeCode(s), n = 0, i;
    for (i = 0; i < a.length; i++) if (ens.a(a[i])) n++;
    return n;
  };

  // str.strip() / lstrip() / rstrip(), avec ou sans liste de caractères
  Unicode.prototype.strip = function (s, chars, cote) {
    var a = pointsDeCode(s), d = 0, f = a.length, self = this, enleve;
    if (chars === undefined) enleve = function (c) { return self.espace.a(c); };
    else {
      var liste = pointsDeCode(chars);
      enleve = function (c) { return liste.indexOf(c) >= 0; };
    }
    if (cote !== "droite") while (d < f && enleve(a[d])) d++;
    if (cote !== "gauche") while (f > d && enleve(a[f - 1])) f--;
    return depuisPoints(a.slice(d, f));
  };

  // -------------------------------------------------- punycode (encodings/punycode.py)

  function seuilT(j, biais) {
    var r = 36 * (j + 1) - biais;
    return r < 1 ? 1 : (r > 26 ? 26 : r);
  }

  function adapter(delta, premier, n) {
    delta = premier ? Math.floor(delta / 700) : Math.floor(delta / 2);
    delta += Math.floor(delta / n);
    var divisions = 0;
    while (delta > 455) { delta = Math.floor(delta / 35); divisions += 36; }
    return divisions + Math.floor(36 * delta / (delta + 38));
  }

  // punycode_decode(texte, "strict") : texte ASCII -> points de code, ou Erreur
  function punycodeDecoder(texte) {
    var pos = texte.lastIndexOf("-"), base, etendu;
    if (pos === -1) { base = []; etendu = texte.toUpperCase(); }
    else { base = pointsDeCode(texte.slice(0, pos)); etendu = texte.slice(pos + 1).toUpperCase(); }
    var car = 0x80, p = -1, biais = 72, ext = 0;
    while (ext < etendu.length) {
      var debut = ext, res = 0, w = 1, j = 0, chiffre, t, c;
      for (;;) {
        if (ext >= etendu.length) throw new Erreur("punycode incomplet");
        c = etendu.charCodeAt(ext++);
        if (c >= 0x41 && c <= 0x5A) chiffre = c - 0x41;
        else if (c >= 0x30 && c <= 0x39) chiffre = c - 22;
        else throw new Erreur("chiffre punycode invalide");
        t = seuilT(j, biais);
        if (chiffre) res += chiffre * w; // Python reste exact ; 0 x Infini donnerait NaN ici
        if (chiffre < t) break;
        w *= 36 - t;
        j++;
      }
      p += res + 1;
      car += Math.floor(p / (base.length + 1));
      if (!(car <= 0x10FFFF)) throw new Erreur("caractère hors Unicode");
      p %= base.length + 1;
      base.splice(p, 0, car);
      biais = adapter(res, debut === 0, base.length);
    }
    return base;
  }

  // punycode_encode(points de code) -> texte ASCII
  function punycodeEncoder(a) {
    var base = "", etendu = [], vus = Object.create(null), i;
    for (i = 0; i < a.length; i++) {
      if (a[i] < 128) base += String.fromCharCode(a[i]);
      else if (!vus[a[i]]) { vus[a[i]] = true; etendu.push(a[i]); }
    }
    etendu.sort(function (x, y) { return x - y; });
    var deltas = [], ancien = 0x80, ancienIndex = -1;
    for (i = 0; i < etendu.length; i++) {
      var car = etendu[i], index = -1, pos = -1, k, avant = 0;
      for (k = 0; k < a.length; k++) if (a[k] < car) avant++;
      var delta = (avant + 1) * (car - ancien);
      for (;;) {
        // selective_find
        for (;;) {
          pos++;
          if (pos === a.length) { index = -1; break; }
          if (a[pos] === car) { index++; break; }
          if (a[pos] < car) index++;
        }
        if (pos === a.length) break;
        delta += index - ancienIndex;
        deltas.push(delta - 1);
        ancienIndex = index;
        delta = 0;
      }
      ancien = car;
    }
    var sortie = "", biais = 72;
    for (i = 0; i < deltas.length; i++) {
      var n = deltas[i], j = 0, t;
      for (;;) {
        t = seuilT(j, biais);
        if (n < t) { sortie += CHIFFRES_PUNY.charAt(n); break; }
        sortie += CHIFFRES_PUNY.charAt(t + ((n - t) % (36 - t)));
        n = Math.floor((n - t) / (36 - t));
        j++;
      }
      biais = adapter(deltas[i], i === 0, base.length + i + 1);
    }
    return base ? base + "-" + sortie : sortie;
  }

  // ------------------------------------------------ IDNA 2003 (encodings/idna.py)

  // nameprep(s) == s ? Exact caractère par caractère (tables du Python d'entraînement),
  // sauf la composition NFKC quand l'étiquette contient des diacritiques combinants :
  // le navigateur utilise alors sa propre normalisation (limite documentée).
  function nameprepIdentique(U, a) {
    var i, rand = [], unRand = false, compose = false;
    for (i = 0; i < a.length; i++) {
      if (U.idnaRejet.a(a[i])) return false;
      if (U.idnaCompose.a(a[i])) compose = true;
      rand.push(U.idnaD1.a(a[i]));
      if (rand[i]) unRand = true;
    }
    if (compose && typeof String.prototype.normalize === "function") {
      var s = depuisPoints(a);
      if (s.normalize("NFKC") !== s) return false;
    }
    if (unRand) {
      for (i = 0; i < a.length; i++) if (U.idnaD2.a(a[i])) return false;
      if (!rand[0] || !rand[a.length - 1]) return false;
    }
    return true;
  }

  // ToUnicode d'une étiquette ASCII en minuscules
  function idnaEtiquette(U, etiquette) {
    if (!commencePar(etiquette, "xn--")) return etiquette;
    var res = punycodeDecoder(etiquette.slice(4)), i, ascii = true;
    for (i = 0; i < res.length; i++) if (res[i] >= 128) ascii = false;
    if (ascii) throw new Erreur("IDNA : aller-retour impossible");
    if (!nameprepIdentique(U, res)) throw new Erreur("IDNA : nameprep");
    if (res.length >= 4 && res[0] === 0x78 && res[1] === 0x6E && res[2] === 0x2D && res[3] === 0x2D) throw new Erreur("IDNA : préfixe ACE");
    var code = "xn--" + punycodeEncoder(res);
    if (code.length >= 64 || code !== etiquette) throw new Erreur("IDNA : aller-retour impossible");
    return depuisPoints(res);
  }

  // hote.encode("ascii").decode("idna")
  function idnaDecoder(U, hote) {
    if (!estAscii(hote)) throw new Erreur("non ASCII");
    var etiquettes = hote.split("."), point = "", out = [], i;
    if (etiquettes[etiquettes.length - 1] === "") { point = "."; etiquettes.pop(); }
    for (i = 0; i < etiquettes.length; i++) out.push(idnaEtiquette(U, etiquettes[i]));
    return out.join(".") + point;
  }

  // ------------------------------------------------------------- ipaddress

  function ipv4Valide(s) {
    if (contient(s, "/") || !s) return false;
    var octets = s.split("."), i, o;
    if (octets.length !== 4) return false;
    for (i = 0; i < 4; i++) {
      o = octets[i];
      if (!o || !/^[0-9]+$/.test(o) || o.length > 3) return false;
      if (o !== "0" && o.charAt(0) === "0") return false;
      if (parseInt(o, 10) > 255) return false;
    }
    return true;
  }

  function hextetValide(h) {
    if (!h || h.length > 4) return false; // int("", 16) échoue
    for (var i = 0; i < h.length; i++) if (HEX.indexOf(h.charAt(i)) < 0) return false;
    return true;
  }

  function ipv6Valide(s) {
    if (contient(s, "/")) return false;
    var p = partition(s, "%");
    if (p[1] && (!p[2] || contient(p[2], "%"))) return false;
    var adr = p[0];
    if (!adr) return false;
    var parts = adr.split(":"), i;
    if (parts.length < 3) return false;
    if (contient(parts[parts.length - 1], ".")) {
      if (!ipv4Valide(parts.pop())) return false;
      parts.push("0", "0");
    }
    if (parts.length > 9) return false;
    var saut = null;
    for (i = 1; i < parts.length - 1; i++) {
      if (!parts[i]) {
        if (saut !== null) return false;
        saut = i;
      }
    }
    var haut, bas;
    if (saut !== null) {
      haut = saut;
      bas = parts.length - saut - 1;
      if (!parts[0]) { haut -= 1; if (haut) return false; }
      if (!parts[parts.length - 1]) { bas -= 1; if (bas) return false; }
      if (8 - (haut + bas) < 1) return false;
    } else {
      if (parts.length !== 8 || !parts[0] || !parts[parts.length - 1]) return false;
      haut = parts.length;
      bas = 0;
    }
    for (i = 0; i < haut; i++) if (!hextetValide(parts[i])) return false;
    for (i = parts.length - bas; i < parts.length; i++) if (!hextetValide(parts[i])) return false;
    return true;
  }

  // ipaddress.ip_address : 4, 6 ou 0 (ValueError)
  function versionIp(s) { return ipv4Valide(s) ? 4 : (ipv6Valide(s) ? 6 : 0); }

  // -------------------------------------------------------- urllib.parse.urlsplit

  // Renvoie {netloc, chemin, requete}, ou null là où urlsplit lève ValueError
  function urlsplit(U, url) {
    var i;
    for (i = 0; i < url.length && url.charCodeAt(i) <= 0x20; i++) { /* lstrip C0 et espace */ }
    url = url.slice(i).replace(/[\t\r\n]/g, "");
    var netloc = "", requete = "";
    i = url.indexOf(":");
    if (i > 0 && /^[a-zA-Z]/.test(url)) {
      var ok = true;
      for (var k = 0; k < i; k++) if (CHARS_SCHEMA.indexOf(url.charAt(k)) < 0) { ok = false; break; }
      if (ok) url = url.slice(i + 1);
    }
    if (url.slice(0, 2) === "//") {
      var delim = url.length;
      for (k = 0; k < 3; k++) {
        var w = url.indexOf("/?#".charAt(k), 2);
        if (w >= 0) delim = Math.min(delim, w);
      }
      netloc = url.slice(2, delim);
      url = url.slice(delim);
      var ouvre = contient(netloc, "["), ferme = contient(netloc, "]");
      if (ouvre !== ferme) return null;
      if (ouvre) {
        var crochet = partition(partition(netloc, "[")[2], "]")[0];
        if (commencePar(crochet, "v")) { if (!RE_IPVFUTUR.test(crochet)) return null; }
        else if (versionIp(crochet) !== 6) return null;
      }
    }
    if (contient(url, "#")) url = partition(url, "#")[0];
    if (contient(url, "?")) { var q = partition(url, "?"); url = q[0]; requete = q[2]; }
    // _checknetloc : caractères dont la forme NFKC contient / ? # @ ou :
    if (netloc && !estAscii(netloc)) {
      var n = pointsDeCode(netloc.replace(/[@:#?]/g, ""));
      for (k = 0; k < n.length; k++) if (U.nfkcNetloc.a(n[k])) return null;
    }
    return { netloc: netloc, chemin: url, requete: requete };
  }

  // urllib.parse.unquote : seules les suites ASCII sont décodées, en UTF-8 avec remplacement
  function utf8Remplacer(octets) {
    var out = [], i = 0, n = octets.length;
    while (i < n) {
      var b = octets[i], besoin = 0, cp = 0, bas = 0x80, haut = 0xBF;
      if (b < 0x80) { out.push(b); i++; continue; }
      if (b >= 0xC2 && b <= 0xDF) { besoin = 1; cp = b & 0x1F; }
      else if (b >= 0xE0 && b <= 0xEF) {
        besoin = 2; cp = b & 0xF;
        if (b === 0xE0) bas = 0xA0;
        if (b === 0xED) haut = 0x9F;
      } else if (b >= 0xF0 && b <= 0xF4) {
        besoin = 3; cp = b & 0x7;
        if (b === 0xF0) bas = 0x90;
        if (b === 0xF4) haut = 0x8F;
      } else { out.push(0xFFFD); i++; continue; }
      var j = i + 1, vus = 0;
      while (vus < besoin) {
        if (j >= n || octets[j] < bas || octets[j] > haut) break;
        cp = (cp << 6) | (octets[j] & 0x3F);
        bas = 0x80; haut = 0xBF;
        j++; vus++;
      }
      if (vus === besoin) { out.push(cp); i = j; }
      else { out.push(0xFFFD); i = j; }
    }
    return out;
  }

  function unquote(s) {
    if (!contient(s, "%")) return s;
    var out = "", morceaux = s.match(/[\x00-\x7f]+|[^\x00-\x7f]+/g), m, k;
    for (m = 0; m < morceaux.length; m++) {
      var bloc = morceaux[m];
      if (!estAscii(bloc)) { out += bloc; continue; }
      var bits = bloc.split("%"), octets = [];
      for (k = 0; k < bits[0].length; k++) octets.push(bits[0].charCodeAt(k));
      for (var b = 1; b < bits.length; b++) {
        var item = bits[b], deux = item.slice(0, 2);
        if (deux.length === 2 && HEX.indexOf(deux.charAt(0)) >= 0 && HEX.indexOf(deux.charAt(1)) >= 0) {
          octets.push(parseInt(deux, 16));
          item = item.slice(2);
        } else octets.push(0x25);
        for (k = 0; k < item.length; k++) octets.push(item.charCodeAt(k));
      }
      out += depuisPoints(utf8Remplacer(octets));
    }
    return out;
  }

  // ------------------------------------------------------------- tldextract

  function Noeud() { this.m = Object.create(null); this.fin = false; this.prive = false; }

  function ajouterSuffixe(racine, suffixe, prive) {
    var etiquettes = suffixe.split(".").reverse(), n = racine, i, k;
    for (i = 0; i < etiquettes.length; i++) {
      k = cle(etiquettes[i]);
      if (!n.m[k]) n.m[k] = new Noeud();
      n = n.m[k];
    }
    n.fin = true;
    n.prive = prive;
  }

  // _decode_punycode : idna.decode (IDNA 2008) d'une étiquette « xn-- », sinon minuscules.
  // Seules les étiquettes de la liste publique comptent, et l'export vérifie qu'elles sont
  // toutes valides en IDNA 2008 : un décodage réussi suffit donc.
  function etiquettePsl(U, etiquette) {
    var min = U.lower(etiquette);
    if (!commencePar(min, "xn--") || !estAscii(min)) return min;
    var reste = min.slice(4);
    if (!reste || reste.charAt(reste.length - 1) === "-") return min;
    try { return depuisPoints(punycodeDecoder(reste)); } catch (e) { if (e instanceof Erreur) return min; throw e; }
  }

  function indexSuffixe(U, racine, etiquettes) {
    var n = racine, idxSuffixe = etiquettes.length, idx = etiquettes.length, noeudSuffixe = racine, i, dec;
    for (i = etiquettes.length - 1; i >= 0; i--) {
      dec = etiquettePsl(U, etiquettes[i]);
      if (n.m[cle(dec)]) {
        idx--;
        n = n.m[cle(dec)];
        if (n.fin) { idxSuffixe = idx; noeudSuffixe = n; }
        continue;
      }
      if (n.m[cle("*")]) return { index: n.m[cle("!" + dec)] ? idx : idx - 1, noeud: n.m[cle("*")] };
      break;
    }
    return idxSuffixe === etiquettes.length ? null : { index: idxSuffixe, noeud: noeudSuffixe };
  }

  function extraire(U, racine, url) {
    // lenient_netloc
    var d = url.indexOf("//"), sans = url;
    if (d === 0) sans = url.slice(2);
    else if (d >= 2 && url.charAt(d - 1) === ":") {
      var ok = true;
      for (var k = 0; k < d - 1; k++) if (CHARS_SCHEMA.indexOf(url.charAt(k)) < 0) { ok = false; break; }
      if (ok) sans = url.slice(d + 2);
    }
    var autorite = partition(partition(partition(sans, "/")[0], "?")[0], "#")[0];
    var apres = apresDernier(autorite, "@"), hote;
    if (apres.charAt(0) === "[" && contient(apres, "]")) hote = partition(apres, "]")[0] + "]";
    else hote = U.strip(U.strip(partition(apres, ":")[0]), ".。．｡", "droite");
    // _extract_netloc
    var net = hote.replace(/[。．｡]/g, ".");
    if (longueur(net) >= 4 && net.charAt(0) === "[" && net.charAt(net.length - 1) === "]" && versionIp(net.slice(1, -1)) === 6) {
      return { sous: "", domaine: net, suffixe: "", prive: false };
    }
    var etiquettes = net.split("."), r = indexSuffixe(U, racine, etiquettes);
    if (!r && etiquettes.length === 4 && U.decimal.a(pointsDeCode(net)[0]) && RE_IPV4_TLDEXTRACT.test(net)) {
      return { sous: "", domaine: net, suffixe: "", prive: false };
    }
    if (!r) return { sous: etiquettes.slice(0, -1).join("."), domaine: etiquettes[etiquettes.length - 1], suffixe: "", prive: false };
    return {
      sous: r.index >= 2 ? etiquettes.slice(0, r.index - 1).join(".") : "",
      domaine: r.index > 0 ? etiquettes[r.index - 1] : "",
      suffixe: etiquettes.slice(r.index).join("."),
      prive: r.noeud.prive
    };
  }

  // -------------------------------------------------------------- Levenshtein

  // Distance de Levenshtein (coûts unitaires, points de code), ou Infinity dès qu'elle ne peut
  // plus descendre sous `plafond` : le minimum d'une ligne de la table ne fait que croître.
  var LIGNE_A = new Int32Array(256), LIGNE_B = new Int32Array(256);
  function levenshtein(a, b, plafond) {
    if (Math.abs(a.length - b.length) >= plafond) return Infinity;
    if (b.length >= LIGNE_A.length) { LIGNE_A = new Int32Array(b.length + 1); LIGNE_B = new Int32Array(b.length + 1); }
    var prec = LIGNE_A, cour = LIGNE_B, i, j, t, min;
    for (j = 0; j <= b.length; j++) prec[j] = j;
    for (i = 1; i <= a.length; i++) {
      cour[0] = min = i;
      for (j = 1; j <= b.length; j++) {
        t = prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
        if (prec[j] + 1 < t) t = prec[j] + 1;
        if (cour[j - 1] + 1 < t) t = cour[j - 1] + 1;
        cour[j] = t;
        if (t < min) min = t;
      }
      if (min >= plafond) return Infinity;
      t = prec; prec = cour; cour = t;
    }
    return prec[b.length];
  }

  // ------------------------------------------------------------------ moteur

  function Moteur(D) {
    if (!D || D.format !== 1) throw new Error("Modèle d'URL absent ou de format inconnu");
    var L = D.listes, i, k;
    this.D = D;
    this.U = new Unicode(D.unicode);
    this.racine = new Noeud();
    for (i = 0; i < L.psl_publiques.length; i++) ajouterSuffixe(this.racine, L.psl_publiques[i], false);
    for (i = 0; i < L.psl_privees.length; i++) ajouterSuffixe(this.racine, L.psl_privees[i], true);
    this.confusables = Object.create(null);
    for (k in L.confusables) if (aPropre.call(L.confusables, k)) this.confusables[pointsDeCode(k)[0]] = L.confusables[k];
    // _SQ_MARQUES (ordre des marques), _SQ_LISTE et _SQ_VERS_MARQUE (la dernière l'emporte)
    this.marques = Object.create(null);
    this.sqListe = [];
    this.sqMarque = [];
    this.sqVersMarque = Object.create(null);
    for (i = 0; i < L.marques.length; i++) {
      if (this.marques[cle(L.marques[i])]) continue;
      var sq = this.squelette(L.marques[i]);
      this.marques[cle(L.marques[i])] = true;
      this.sqListe.push(pointsDeCode(sq));
      this.sqMarque.push(L.marques[i]);
    }
    for (i = 0; i < this.sqListe.length; i++) this.sqVersMarque[cle(depuisPoints(this.sqListe[i]))] = this.sqMarque[i];
    this.raccourcisseurs = Object.create(null);
    for (i = 0; i < L.raccourcisseurs.length; i++) this.raccourcisseurs[cle(L.raccourcisseurs[i])] = true;
    this.reMots = new RegExp(L.mots_suspects.map(function (m) { return m.replace(/[.*+?^${}()|[\]\\\-]/g, "\\$&"); }).join("|"), "g");
    this.nomsMarques = L.noms_marques;
    this.vocab = Object.create(null);
    for (k in D.vocab_tld) if (aPropre.call(D.vocab_tld, k)) this.vocab[cle(k)] = D.vocab_tld[k];
    this.categorielles = Object.create(null);
    for (i = 0; i < D.categorielles.length; i++) this.categorielles[D.categorielles[i]] = true;
    this.arbres = [];
    for (i = 0; i < D.arbres.length; i++) this.arbres.push(this.construireArbre(D.arbres[i]));
  }

  // ------------------------------------------------------------ features.py

  Moteur.prototype.squelette = function (texte) {
    var a = pointsDeCode(texte), out = "", i, c;
    for (i = 0; i < a.length; i++) {
      c = this.confusables[a[i]];
      out += c !== undefined ? c : depuisPoints([a[i]]);
    }
    out = this.U.lower(out);
    var multi = this.D.listes.multi;
    for (i = 0; i < multi.length; i++) out = out.split(multi[i][0]).join(multi[i][1]);
    return out.replace(/[.\-_]/g, "");
  };

  Moteur.prototype.retirerSchema = function (url) {
    return this.U.strip(url).replace(RE_SCHEMA, "");
  };

  // decouper() : [hote, hote_affiche, chemin, requete, domaine_enregistre, sous_domaine,
  //               suffixe, hebergeur_prive, port_explicite]
  Moteur.prototype.decouper = function (url) {
    var U = this.U, brut = U.strip(url), netloc, chemin, requete;
    if (!RE_SCHEMA.test(brut)) brut = "http://" + brut;
    var r = urlsplit(U, brut);
    if (r) { netloc = r.netloc; chemin = r.chemin; requete = r.requete; }
    else { // URL malformée : découpage manuel, comme features.py
      var i = brut.indexOf("://"), reste = i < 0 ? brut : brut.slice(i + 3);
      var p = partition(reste, "/");
      netloc = p[0];
      var q = partition("/" + p[2], "?");
      chemin = q[0];
      requete = q[2];
    }
    var hote = apresDernier(netloc, "@"), port;
    if (commencePar(hote, "[")) {
      var h = partition(hote, "]");
      hote = h[0] + "]";
      port = U.strip(h[2], ":", "gauche");
    } else {
      var h2 = partition(hote, ":");
      hote = h2[0];
      port = h2[2];
    }
    var portExplicite = U.tous(port, U.chiffre) ? 1 : 0;
    var hoteMin = U.lower(hote), hoteAffiche = hote;
    if (commencePar(hoteMin, "xn--") || contient(hoteMin, ".xn--")) {
      try { hoteAffiche = idnaDecoder(U, hoteMin); } catch (e) { if (e instanceof Erreur) hoteAffiche = hoteMin; else throw e; }
    }
    var ext = extraire(U, this.racine, hoteMin);
    var enregistre = ext.domaine && ext.suffixe ? ext.domaine + "." + ext.suffixe : (ext.domaine || hoteMin);
    return [hote, hoteAffiche, chemin, requete, enregistre, ext.sous, ext.suffixe, ext.prive, portExplicite];
  };

  Moteur.prototype.estIp = function (hote) {
    var h = this.U.lower(this.U.strip(hote, "[]"));
    if (versionIp(h)) return 1;
    if (/^0x[0-9a-f]{8}$/.test(h)) return 1;
    var n = longueur(h);
    return n >= 8 && n <= 10 && this.U.tous(h, this.U.decimal) ? 1 : 0;
  };

  Moteur.prototype.entropie = function (s) {
    var a = pointsDeCode(s), n = a.length, ordre = [], vus = Object.create(null), i, somme = 0;
    if (!n) return 0;
    for (i = 0; i < n; i++) {
      if (vus[a[i]] === undefined) { vus[a[i]] = 0; ordre.push(a[i]); }
      vus[a[i]]++;
    }
    for (i = 0; i < ordre.length; i++) {
      var p = vus[ordre[i]] / n;
      somme += p * log2(p);
    }
    return -somme;
  };

  Moteur.prototype.mots = function (s) {
    var m = s.match(this.reMots);
    return m ? m.length : 0;
  };

  // re.search(r"\.php\b", s) avec le \b Unicode de Python
  Moteur.prototype.php = function (s) {
    var i = s.indexOf(".php");
    while (i >= 0) {
      var suite = pointsDeCode(s.slice(i + 4, i + 6));
      if (!suite.length || !this.U.mot.a(suite[0])) return 1;
      i = s.indexOf(".php", i + 1);
    }
    return 0;
  };

  function enregAffiche(hoteAff, enreg) {
    var etiquettes = hoteAff.split("."), n = compter(enreg, ".") + 1;
    return etiquettes.length >= n ? etiquettes.slice(etiquettes.length - n).join(".") : enreg;
  }

  // attributs() de features.py ; details sert à l'affichage (marque imitée)
  Moteur.prototype.attributs = function (url) {
    var U = this.U, sansSchema = this.retirerSchema(url), d = this.decouper(url);
    var hote = d[0], hoteAff = d[1], chemin = d[2], requete = d[3], enreg = d[4], sous = d[5], prive = d[7];
    var hoteMin = U.lower(hote);
    var cheminReq = requete ? chemin + "?" + requete : chemin;
    var cheminMin = U.lower(unquote(cheminReq));
    var etiquettes = hoteMin.split(".").filter(function (l) { return l; });
    var nomDomaine = enreg ? enreg.split(".")[0] : "";

    var sq = this.squelette(enregAffiche(hoteAff, enreg));
    var vraieMarque = !!this.marques[cle(enreg)];
    var squeletteMarque = 0, dist = 6, distRel = 1.0, marqueProche = null, i;
    if (!vraieMarque && sq) {
      if (this.sqVersMarque[cle(sq)] !== undefined) {
        squeletteMarque = 1; dist = 0; distRel = 0.0;
        marqueProche = this.sqVersMarque[cle(sq)];
      } else {
        var a = pointsDeCode(sq), meilleur = -1, dMin = Infinity, dd;
        // process.extractOne : le premier minimum gagne ; on ne calcule une distance que si
        // elle peut battre strictement le meilleur score déjà trouvé
        for (i = 0; i < this.sqListe.length; i++) {
          dd = levenshtein(a, this.sqListe[i], dMin);
          if (dd < dMin) { dMin = dd; meilleur = i; }
        }
        if (meilleur >= 0) {
          dist = Math.min(dMin, 6);
          distRel = Math.min(dist / Math.max(this.sqListe[meilleur].length, 1), 1.0);
          marqueProche = this.sqMarque[meilleur];
        }
      }
    }

    var marqueHors = 0, lieux = (sous || "") + " " + cheminMin + " " + nomDomaine, marqueCitee = null;
    for (i = 0; i < this.nomsMarques.length; i++) {
      if (contient(lieux, this.nomsMarques[i][0]) && this.nomsMarques[i][1].indexOf(enreg) < 0) {
        marqueHors = 1;
        marqueCitee = this.nomsMarques[i][1][0];
        break;
      }
    }

    var nbParametres = requete ? requete.split("&").filter(function (x) { return x; }).length : 0;
    var longSans = longueur(sansSchema), maxLabel = 0;
    for (i = 0; i < etiquettes.length; i++) maxLabel = Math.max(maxLabel, longueur(etiquettes[i]));
    var ptsAff = pointsDeCode(hoteAff), nonAscii = 0;
    for (i = 0; i < ptsAff.length; i++) if (ptsAff[i] > 127) nonAscii = 1;

    return {
      valeurs: {
        long_url: longSans,
        long_hote: longueur(hote),
        long_chemin: longueur(cheminReq),
        nb_sous_domaines: sous ? sous.split(".").length : 0,
        profondeur_chemin: chemin.split("/").filter(function (p) { return p; }).length,
        nb_parametres: nbParametres,
        ip_litterale: this.estIp(hote),
        port_explicite: d[8],
        nb_tirets_hote: compter(hote, "-"),
        nb_chiffres_hote: U.compte(hote, U.chiffre),
        ratio_chiffres: U.compte(sansSchema, U.chiffre) / Math.max(longSans, 1),
        entropie_domaine: this.entropie(nomDomaine),
        entropie_url: this.entropie(sansSchema),
        arobase: contient(sansSchema, "@") ? 1 : 0,
        double_barre_chemin: contient(chemin, "//") ? 1 : 0,
        nb_pourcent: compter(sansSchema, "%"),
        mots_suspects_hote: this.mots(hoteMin),
        mots_suspects_chemin: this.mots(cheminMin),
        extension_php: this.php(cheminMin),
        hebergeur_gratuit: prive ? 1 : 0,
        raccourcisseur: this.raccourcisseurs[cle(enreg)] ? 1 : 0,
        hote_majuscule: U.compte(hote, U.majuscule) ? 1 : 0,
        punycode: contient(hoteMin, "xn--") ? 1 : 0,
        non_ascii: nonAscii,
        squelette_marque: squeletteMarque,
        distance_marque: dist,
        distance_marque_rel: distRel,
        marque_hors_domaine: marqueHors,
        domaine_dans_sous_domaine: sous && RE_DANS_SOUS.test(U.lower(sous)) ? 1 : 0,
        long_label_max: maxLabel
      },
      decoupe: d,
      details: { marqueProche: marqueProche, marqueCitee: marqueCitee }
    };
  };

  // modeles.tld() : dernière étiquette de l'hôte, à partir du découpage déjà fait
  Moteur.prototype.tldDe = function (hote) {
    var h = this.U.strip(this.U.lower(hote), "[]");
    return contient(h, ".") ? apresDernier(h, ".") : "";
  };
  Moteur.prototype.tld = function (url) { return this.tldDe(this.decouper(url)[0]); };

  // construire_X : 30 attributs + code du TLD, en float32 comme numpy
  Moteur.prototype.vecteur = function (url, attributs) {
    var at = attributs || this.attributs(url), a = at.valeurs, noms = this.D.attributs, x = [], i;
    for (i = 0; i < noms.length - 1; i++) x.push(fround(a[noms[i]]));
    x.push(fround(this.vocab[cle(this.tldDe(at.decoupe[0]))] || 0));
    return x;
  };

  // --------------------------------------------------------------- LightGBM

  // Tableaux en ordre préfixe -> enfants explicites. Seuils numériques : plus grand float32
  // inférieur ou égal au seuil double de LightGBM (comparaison identique pour un float32).
  Moteur.prototype.construireArbre = function (A) {
    var n = A.s.length, gauche = new Array(n), droite = new Array(n), valeur = new Array(n);
    var seuil = new Array(n), cat = new Array(n), profMax = 0, iSeuil = 0, iFeuille = 0, self = this;
    function construire(i, prof) {
      profMax = Math.max(profMax, prof);
      if (A.s[i] < 0) { valeur[i] = A.v[iFeuille++]; return i + 1; }
      if (self.categorielles[A.s[i]]) {
        var ens = Object.create(null), liste = A.c[A.t[iSeuil++]];
        for (var k = 0; k < liste.length; k++) ens[liste[k]] = true;
        cat[i] = ens;
      } else seuil[i] = fround(A.t[iSeuil++]);
      gauche[i] = i + 1;
      droite[i] = construire(i + 1, prof + 1);
      return construire(droite[i], prof + 1);
    }
    construire(0, 0);
    var attendu = 0, i;
    if (n === 1) attendu = valeur[0];
    else for (i = 0; i < n; i++) if (A.s[i] < 0) attendu += (A.n[i] / A.n[0]) * valeur[i];
    return { s: A.s, g: gauche, d: droite, v: valeur, seuil: seuil, cat: cat, n: A.n, prof: profMax, attendu: attendu };
  };

  // Tree::Decision (NumericalDecision / CategoricalDecision)
  function decision(arbre, i, x) {
    var f = x[arbre.s[i]];
    if (arbre.cat[i]) {
      if (f !== f) return arbre.d[i];
      var e = f < 0 ? Math.ceil(f) : Math.floor(f); // static_cast<int> : troncature
      return e >= 0 && arbre.cat[i][e] ? arbre.g[i] : arbre.d[i];
    }
    if (f !== f) f = 0; // valeur manquante sans traitement dédié : 0
    return f <= arbre.seuil[i] ? arbre.g[i] : arbre.d[i];
  }

  Moteur.prototype.brut = function (x) {
    var somme = 0, k, a, i;
    for (k = 0; k < this.arbres.length; k++) {
      a = this.arbres[k];
      i = 0;
      while (a.s[i] >= 0) i = decision(a, i, x);
      somme += a.v[i];
    }
    return somme;
  };

  // sigmoïde de LightGBM puis Platt : expit(coef * logit(clip(s)) + intercept)
  Moteur.prototype.calibrer = function (brut) {
    var c = this.D.calibration, s = 1.0 / (1.0 + Math.exp(-brut));
    s = Math.min(Math.max(s, c.borne), 1 - c.borne);
    return 1 / (1 + Math.exp(-(c.coef * Math.log(s / (1 - s)) + c.intercept)));
  };

  // ------------------------------------------------- contributions SHAP (TreeSHAP)

  // Port de Tree::TreeSHAP de LightGBM, opérations dans le même ordre. Le chemin vit dans des
  // tableaux plats avec les mêmes décalages que le C++ (unique_path = parent + unique_depth) :
  // aucun objet n'est créé pendant le parcours, ce qui compte sur un téléphone d'entrée de gamme.
  function Chemins(taille) {
    this.f = new Int32Array(taille);
    this.z = new Float64Array(taille);
    this.o = new Float64Array(taille);
    this.w = new Float64Array(taille);
  }

  function etendre(C, b, d, zero, un, f) {
    C.f[b + d] = f; C.z[b + d] = zero; C.o[b + d] = un; C.w[b + d] = d === 0 ? 1 : 0;
    for (var i = d - 1; i >= 0; i--) {
      C.w[b + i + 1] += un * C.w[b + i] * (i + 1) / (d + 1);
      C.w[b + i] = zero * C.w[b + i] * (d - i) / (d + 1);
    }
  }

  function derouler(C, b, d, idx) {
    var un = C.o[b + idx], zero = C.z[b + idx], suivant = C.w[b + d], i, tmp;
    for (i = d - 1; i >= 0; i--) {
      if (un !== 0) {
        tmp = C.w[b + i];
        C.w[b + i] = suivant * (d + 1) / ((i + 1) * un);
        suivant = tmp - C.w[b + i] * zero * (d - i) / (d + 1);
      } else {
        C.w[b + i] = (C.w[b + i] * (d + 1)) / (zero * (d - i));
      }
    }
    for (i = idx; i < d; i++) {
      C.f[b + i] = C.f[b + i + 1];
      C.z[b + i] = C.z[b + i + 1];
      C.o[b + i] = C.o[b + i + 1];
    }
  }

  function sommeDeroulee(C, b, d, idx) {
    var un = C.o[b + idx], zero = C.z[b + idx], suivant = C.w[b + d], total = 0, i, tmp;
    for (i = d - 1; i >= 0; i--) {
      if (un !== 0) {
        tmp = suivant * (d + 1) / ((i + 1) * un);
        total += tmp;
        suivant = C.w[b + i] - tmp * zero * ((d - i) / (d + 1));
      } else {
        total += (C.w[b + i] / zero) / ((d - i) / (d + 1));
      }
    }
    return total;
  }

  function treeShap(a, x, phi, C, noeud, d, pb, zeroParent, unParent, fParent) {
    var b = pb + d, i;
    for (i = 0; i < d; i++) { C.f[b + i] = C.f[pb + i]; C.z[b + i] = C.z[pb + i]; C.o[b + i] = C.o[pb + i]; C.w[b + i] = C.w[pb + i]; }
    etendre(C, b, d, zeroParent, unParent, fParent);
    if (a.s[noeud] < 0) {
      for (i = 1; i <= d; i++) {
        var w = sommeDeroulee(C, b, d, i);
        phi[C.f[b + i]] += w * (C.o[b + i] - C.z[b + i]) * a.v[noeud];
      }
      return;
    }
    var chaud = decision(a, noeud, x), froid = chaud === a.g[noeud] ? a.d[noeud] : a.g[noeud];
    var total = a.n[noeud], zeroChaud = a.n[chaud] / total, zeroFroid = a.n[froid] / total;
    var zeroEntrant = 1, unEntrant = 1, f = a.s[noeud], idx;
    for (idx = 0; idx <= d; idx++) if (C.f[b + idx] === f) break;
    if (idx !== d + 1) {
      zeroEntrant = C.z[b + idx];
      unEntrant = C.o[b + idx];
      derouler(C, b, d, idx);
      d -= 1;
    }
    treeShap(a, x, phi, C, chaud, d + 1, b, zeroChaud * zeroEntrant, unEntrant, f);
    treeShap(a, x, phi, C, froid, d + 1, b, zeroFroid * zeroEntrant, 0, f);
  }

  // pred_contrib : une contribution par attribut, puis la valeur de base (ExpectedValue)
  Moteur.prototype.contributions = function (x) {
    var nb = this.D.attributs.length, phi = [], k, i, a;
    if (!this.chemins) {
      var prof = 0;
      for (k = 0; k < this.arbres.length; k++) prof = Math.max(prof, this.arbres[k].prof);
      this.chemins = new Chemins((prof + 3) * (prof + 4) / 2);
    }
    for (i = 0; i <= nb; i++) phi.push(0);
    for (k = 0; k < this.arbres.length; k++) {
      a = this.arbres[k];
      phi[nb] += a.attendu;
      if (a.s.length > 1) treeShap(a, x, phi, this.chemins, 0, 0, 0, 1, 1, -1);
    }
    return phi;
  };

  // ----------------------------------------------------------------- analyse

  // 3 : au-dessus du seuil « 80 % de rappel » (peu de faux positifs) ... 0 : sous « 95 % »
  Moteur.prototype.niveau = function (p) {
    var s = this.D.seuils;
    return p >= s.r80 ? 3 : (p >= s.r90 ? 2 : (p >= s.r95 ? 1 : 0));
  };

  Moteur.prototype.analyser = function (url) {
    var at = this.attributs(url), x = this.vecteur(url, at), brut = this.brut(x), p = this.calibrer(brut);
    var phi = this.contributions(x), noms = this.D.attributs, raisons = [], i;
    for (i = 0; i < noms.length; i++) raisons.push({ nom: noms[i], valeur: x[i], contribution: phi[i] });
    raisons.sort(function (a, b) { return Math.abs(b.contribution) - Math.abs(a.contribution); });
    return {
      url: url, decoupe: at.decoupe, attributs: at.valeurs, details: at.details, tld: this.tldDe(at.decoupe[0]),
      x: x, brut: brut, proba: p, niveau: this.niveau(p), raisons: raisons, base: phi[noms.length]
    };
  };

  // ------------------------------------------------- liens contenus dans un message

  // Remet en état les liens désamorcés (hxxp, [.], (dot)...) puis garde les mots qui sont
  // des liens : avec schéma, commençant par www., ou nom de domaine dont l'extension figure
  // dans la liste publique des suffixes. Une extension écrite en majuscules sans chemin
  // (« M.Ba ») est un nom, pas un lien. Au plus `max` liens, sans doublon.
  var PONCT_DEBUT = /^[(\[{<«"'“‘]+/;
  var PONCT_FIN = /[.,;:!?)\]}>»"'”’]+$/;
  Moteur.prototype.extraireLiens = function (texte, max) {
    max = max || 10;
    var t = String(texte)
      .replace(/h(?:xx|XX|xX|Xx)p(s?):\/\//g, "http$1://")
      .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)/gi, ".")
      .replace(/\[:\]/g, ":");
    var mots = t.split(/\s+/), vus = Object.create(null), out = [], trop = false, i;
    for (i = 0; i < mots.length; i++) {
      var m = mots[i].replace(PONCT_DEBUT, "").replace(PONCT_FIN, "");
      if (!m || vus[cle(m)]) continue;
      var lien = /^(?:https?|ftp):\/\/./i.test(m) || /^www\.[^.]/i.test(m);
      if (!lien && contient(m, ".") && !contient(m, "@") && !/^(?:mailto|tel|sms|javascript|data|file):/i.test(m)) {
        var hote = m.split(/[\/?#]/)[0], suffixe = this.decouper(m)[6];
        var ext = apresDernier(hote.split(":")[0], ".");
        lien = !!suffixe && (ext === this.U.lower(ext) || /[\/?#]/.test(m));
      }
      if (!lien) continue;
      if (out.length === max) { trop = true; break; }
      vus[cle(m)] = true;
      out.push(m);
    }
    out.tronque = trop;
    return out;
  };

  // Affichage inerte : hxxp(s):// et points du nom d'hôte entre crochets
  function desamorcer(url) {
    var m = /^([a-zA-Z][a-zA-Z0-9+.\-]*:\/\/)?([^\/?#]*)([\s\S]*)$/.exec(String(url));
    return (m[1] || "").replace(/^http/i, "hxxp") + m[2].split(".").join("[.]") + m[3];
  }

  window.PDS_MOTEUR_URL = {
    creer: function (D) { return new Moteur(D); },
    desamorcer: desamorcer,
    // pour les tests
    interne: { punycodeDecoder: punycodeDecoder, punycodeEncoder: punycodeEncoder, versionIp: versionIp, unquote: unquote }
  };
})();
