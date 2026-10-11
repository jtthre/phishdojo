/* PhishDojo Senegal - masquage des donnees personnelles, execute dans le navigateur.
 *
 * Principe : le message est masque AVANT tout envoi. Ce qui part vers le serveur ne contient
 * plus de numero, de montant, de reference, de code, d'e-mail ni de nom reconnu. Le serveur
 * reapplique les regles deterministes (numeros, e-mails, references, longues suites de
 * chiffres) en seconde ligne de defense : voir supabase/schema.sql.
 *
 * Ce module ne depend de rien et s'utilise aussi sous Node (tests de fuite).
 */
(function (root) {
  "use strict";

  var VERSION = "m1";

  var J = {
    tel: "[NUMÉRO]",
    montant: "[MONTANT]",
    ref: "[RÉFÉRENCE]",
    code: "[CODE]",
    email: "[E-MAIL]",
    nom: "[NOM]",
    params: "[PARAMÈTRES]",
    manuel: "[MASQUÉ]"
  };

  // Prenoms et noms de famille courants au Senegal. Liste volontairement large : un faux
  // masquage coute peu, une fuite coute cher. Les marqueurs (« de », « M. »...) attrapent
  // aussi les noms absents de ces listes.
  var PRENOMS = ("Mamadou Moussa Awa Fatou Aminata Ibrahima Cheikh Abdoulaye Ousmane Modou Aliou Khady " +
    "Mariama Ndeye Ndèye Astou Coumba Seynabou Oumar Babacar Pape Papa Mame Adama Assane Lamine " +
    "Mouhamed Mohamed Mohammed Souleymane Daouda Ablaye Bineta Marème Mareme Rokhaya Dieynaba Aissatou " +
    "Aïssatou Yacine Sokhna Fama Bintou Penda Djibril Alassane Serigne Omar Malick Saliou Amadou Demba " +
    "Samba Khadija Fatoumata Absa Khoudia Ngoné Ngone Maimouna Maïmouna Racine Ismaila Ismaïla Elhadji " +
    "Mbaye Birame Boubacar Idrissa Mansour Moustapha Mustapha Ndiaga Ousseynou Pathé Sidy Tidiane " +
    "Youssou Yaya Arame Anta Diarra Dior Fanta Habibatou Kiné Kine Mbayang Nafissatou Oumy Ramatoulaye " +
    "Sala Soda Thioro Yandé Yande Codou Ndella Adja Aby Sophie Marie Jean Paul Pierre").split(" ");
  var NOMS = ("Diop Ndiaye Fall Sow Diallo Faye Gueye Guèye Mbaye Sarr Cisse Cissé Kane Seck Thiam Niang " +
    "Ndoye Dieng Diouf Sall Toure Touré Mbengue Diagne Wade Camara Sène Sene Thiaw Diatta Badji Sambou " +
    "Mendy Gomis Coly Tall Barry Ndour Samb Wane Thiore Thioune Mbodj Ndao Gaye Kebe Kébé Lam Lô Ly " +
    "Ba Bâ Sy Ka Dia Kandji Sagna Sané Sane Tamba Konaté Konate Traoré Traore Keita Keïta Sylla " +
    "Diedhiou Diédhiou Manga Senghor Dione Ngom Pouye Diakhate Diakhaté Dramé Drame Doucoure Doucouré " +
    "Fofana Mané Mane Niasse Bousso Mboup Lo Cissokho Diaw Dabo Dembélé Dembele Sakho Goudiaby").split(" ");

  // Mots en majuscule a ne jamais prendre pour un nom (marques, lieux, mots d'interface).
  var PAS_UN_NOM = ("Wave Orange Money Free Wizall Expresso Sonatel Yas Kash Ecobank CBAO SGBS BICIS BOA UBA " +
    "Banque Société Societe Générale Generale Senelec SenEau Woyofal Rapido DHL Poste La Le Les Un Une " +
    "Sénégal Senegal Dakar Thiès Thies Pikine Guédiawaye Guediawaye Rufisque Touba Mbour Kaolack Ziguinchor " +
    "Saint Louis Tambacounda Kolda Louga Diourbel Fatick Kaffrine Kédougou Matam Sédhiou Gambie Mali " +
    "France Paris Afrique Service Client Clients Support Agent Agence Compte Mon Ma Mes Votre Vos Cher Chère " +
    "Monsieur Madame Bonjour Bonsoir Salam Merci Jërëjëf Urgent Code Retrait Transfert Dépôt Depot " +
    "Facebook WhatsApp Telegram Instagram TikTok Google Apple Microsoft Gmail SMS OTP PIN ID NB OK " +
    "Ramadan Tabaski Korité Magal Lundi Mardi Mercredi Jeudi Vendredi Samedi Dimanche Janvier Février " +
    "Mars Avril Mai Juin Juillet Août Septembre Octobre Novembre Décembre").split(" ");

  function ensemble(liste) {
    var s = Object.create(null);
    liste.forEach(function (m) { s[m.toLowerCase()] = true; });
    return s;
  }
  var SET_PRENOMS = ensemble(PRENOMS), SET_NOMS = ensemble(NOMS), SET_EXCLUS = ensemble(PAS_UN_NOM);

  var MAJ = "A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸÑ";
  var MIN = "a-zàâäçéèêëîïôöùûüÿñœæ";
  var MOT_CAP = "[" + MAJ + "][" + MIN + MAJ + "'’-]*";

  // ---------------------------------------------------------------------------- utilitaires
  function proteger(texte, re, store, transform) {
    return texte.replace(re, function () {
      var m = arguments[0];
      var val = transform ? transform.apply(null, arguments) : m;
      store.push(val);
      return "\u0000" + (store.length - 1) + "\u0000";
    });
  }
  function restaurer(texte, store) {
    // deux passes : un element protege peut en contenir un autre
    for (var i = 0; i < 2; i++) {
      texte = texte.replace(/\u0000(\d+)\u0000/g, function (_, n) { return store[+n]; });
    }
    return texte;
  }

  // ---------------------------------------------------------------------------- regles
  var RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

  var TLD = "sn|com|net|org|info|xyz|top|online|site|app|me|io|co|ly|gl|cc|ru|cn|tk|ml|ga|cf|gq|link|club|shop|live|vip|pro|biz|fr|africa|store|click|icu|cyou|buzz|win|bid|loan|work|page|dev|ws|tv";
  var RE_URL = new RegExp(
    "\\b(?:https?:\\/\\/|www\\.)[^\\s<>\"'«»]+" +
    "|\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.(?:" + TLD + ")\\b(?:\\/[^\\s<>\"'«»]*)?",
    "gi");

  // Numeros senegalais (mobiles 70-78, fixes 33) avec ou sans indicatif, puis tout numero
  // international, puis toute suite d'au moins 8 chiffres (eventuellement separes).
  var SEP = "[\\s.\\-\\u00a0]?";
  var RE_TEL_SN = new RegExp(
    "(?:(?:\\+|00)\\s?221" + SEP + "|\\b221" + SEP + ")?\\b(?:7[0-8]|3[03])" + SEP + "\\d{3}" + SEP + "\\d{2}" + SEP + "\\d{2}\\b", "g");
  var RE_TEL_INTL = /(?:\+|\b00)\d[\d\s.\- ()]{6,18}\d/g;
  var RE_LONG = /\d(?:[\s.\- ]?\d){7,}/g;

  var DEVISE = "(?:f\\s?cfa|fcfa|cfa|xof|francs?|frs?|f)";
  var NOMBRE = "\\d{1,3}(?:[\\s.,\\u00a0]\\d{3})+(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?";
  var RE_MONTANT = new RegExp(
    "(?:(?:" + NOMBRE + ")\\s?" + DEVISE + "(?![" + MIN + MAJ + "])" +
    "|\\b(?:cfa|fcfa|xof)\\s?(?:" + NOMBRE + "))", "gi");
  // « solde : 42 500 », « montant de 25000 » : le mot-cle reste, le nombre part.
  var RE_MONTANT_MOT = new RegExp(
    "\\b(montant|somme|solde|frais)(\\s*(?:de|:)?\\s*)(?:" + NOMBRE + ")", "gi");

  // References de transaction : un jeton qui melange lettres et chiffres, 6 caracteres ou plus.
  // (sans lookbehind : les anciens Safari iOS ne le comprennent pas)
  var RE_REF = /(^|[^\w\u0000])((?=[A-Za-z0-9.\-_\/]*\d)(?=[A-Za-z0-9.\-_\/]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9.\-_\/]{4,}[A-Za-z0-9])(?![\w])/g;

  var RE_DATE = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-](?:\d{4}|\d{2})\b|\b\d{1,2}\s?[h:]\s?\d{2}\b/g;
  var RE_ANNEE = /\b(?:19|20)\d{2}\b/g;
  var RE_CODE = /\b\d{4,8}\b/g;

  // Noms : apres un marqueur, ou mots reconnus dans les listes.
  var MARQUEURS = "(?:de|du|à|a|par|pour|chez|avec|from|to|M\\.|Mr\\.?|Mme|Mlle|Monsieur|Madame|Mademoiselle|Dr\\.?|cher|chère|bonjour|bonsoir|salut|salam|nom|prénom|bénéficiaire|beneficiaire|expéditeur|expediteur|destinataire|titulaire|client)";
  var RE_APRES_MARQUEUR = new RegExp(
    "(^|[^" + MIN + MAJ + "])(" + MARQUEURS + ")(\\s*:?\\s+)((?:" + MOT_CAP + ")(?:\\s+(?:" + MOT_CAP + ")){0,3})", "g");
  var RE_MOT_CAP = new RegExp("(^|[^" + MIN + MAJ + "\\u0000\\[])(" + MOT_CAP + ")(?![" + MIN + MAJ + "'’-])", "g");

  function estNomProbable(mot) {
    var m = mot.toLowerCase();
    if (SET_EXCLUS[m]) return false;
    return !!(SET_PRENOMS[m] || SET_NOMS[m]);
  }

  // « M. Ndiongue », « Madame Mbissine Djigo » : apres un titre, le mot en majuscule est un nom.
  var RE_TITRE = new RegExp(
    "(^|[^" + MIN + MAJ + "])(M\\.|Mr\\.?|Mme\\.?|Mlle\\.?|Monsieur|Madame|Mademoiselle|Dr\\.?|Docteur|Me\\.?|Maître)(\\s+)" +
    "((?:" + MOT_CAP + ")(?:\\s+(?:" + MOT_CAP + ")){0,3})", "g");

  function masquerNomsApresTitre(texte) {
    return texte.replace(RE_TITRE, function (tout, avant, titre, espace, groupe) {
      var mots = groupe.split(/\s+/), garde = 0;
      while (garde < mots.length && !SET_EXCLUS[mots[garde].toLowerCase()]) garde++;
      if (!garde) return tout;
      var reste = mots.slice(garde).join(" ");
      return avant + titre + espace + J.nom + (reste ? " " + reste : "");
    });
  }

  function masquerNomsApresMarqueur(texte) {
    return texte.replace(RE_APRES_MARQUEUR, function (tout, avant, marqueur, espace, groupe) {
      var mots = groupe.split(/\s+/);
      // on s'arrete au premier mot exclu (marque, lieu, mot d'interface)
      var garde = [];
      for (var i = 0; i < mots.length; i++) {
        if (SET_EXCLUS[mots[i].toLowerCase()]) break;
        garde.push(mots[i]);
      }
      if (!garde.length) return tout;
      // un seul mot en tete de phrase apres « a » ou « de » peut etre un mot ordinaire :
      // on ne masque que s'il est connu ou en majuscules, ou si un second mot suit
      if (garde.length === 1 && /^(?:de|du|à|a|par|pour|chez|avec|to|from)$/i.test(marqueur)) {
        var w = garde[0];
        var enCapitales = w.length > 1 && w === w.toUpperCase();
        if (!estNomProbable(w) && !enCapitales) return tout;
      }
      var reste = mots.slice(garde.length).join(" ");
      return avant + marqueur + espace + J.nom + (reste ? " " + reste : "");
    });
  }

  function masquerNomsConnus(texte) {
    return texte.replace(RE_MOT_CAP, function (tout, avant, mot) {
      return estNomProbable(mot) ? avant + J.nom : tout;
    }).replace(/\[NOM\](?:\s+\[NOM\])+/g, J.nom);
  }

  function nettoyerUrl(url, domaines) {
    var brut = /\[[^\[\]]+\]$/.test(url) ? url : url.replace(/[.,;:!?)\]]+$/, "");
    var fin = url.slice(brut.length);
    var m = /^((?:https?:\/\/)?)([^\/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(brut);
    if (!m) return url;
    var hote = m[2].toLowerCase().replace(/^www\./, "");
    if (domaines.indexOf(hote) < 0) domaines.push(hote);
    var chemin = m[3] || "";
    // un numero ou un identifiant peut se cacher dans le chemin (wa.me/2217..., /suivi/AB12CD34)
    chemin = chemin.replace(/(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{6,}/g, J.ref)
                   .replace(/\d{6,}/g, J.tel);
    var requete = m[4] ? "?" + J.params : "";
    return m[1] + m[2] + chemin + requete + fin;
  }

  // ---------------------------------------------------------------------------- API
  function masquer(texte) {
    var domaines = [];
    var store = [];
    // NFKC ramene les chiffres « exotiques » (pleine chasse, exposants...) a 0-9, et on retire
    // les caracteres invisibles qui servent a couper un numero pour echapper au masquage.
    var t = String(texte || "").normalize("NFKC").replace(/[\u0000\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/g, "");

    t = t.replace(RE_EMAIL, J.email);
    t = proteger(t, RE_URL, store, function (u) { return nettoyerUrl(u, domaines); });
    t = t.replace(RE_MONTANT, J.montant);
    t = t.replace(RE_MONTANT_MOT, function (_, mot, esp) { return mot + esp + J.montant; });
    t = t.replace(RE_TEL_SN, J.tel);
    t = t.replace(RE_TEL_INTL, J.tel);
    t = t.replace(RE_REF, function (_, avant) { return avant + J.ref; });
    t = t.replace(RE_LONG, J.tel);
    t = proteger(t, RE_DATE, store);
    t = proteger(t, RE_ANNEE, store);
    t = t.replace(RE_CODE, J.code);
    t = masquerNomsApresTitre(t);
    t = masquerNomsApresMarqueur(t);
    t = masquerNomsConnus(t);
    t = restaurer(t, store);

    return { texte: t, domaines: domaines, version: VERSION };
  }

  // Masquage manuel : remplace toutes les occurrences d'un extrait choisi par la personne.
  function masquerExtrait(texte, extrait) {
    extrait = String(extrait || "").trim();
    if (extrait.length < 2) return texte;
    return texte.split(extrait).join(J.manuel);
  }

  // Normalise un numero d'expediteur pour l'empreinte serveur (chiffres seuls, indicatif 221).
  function normaliserNumero(n) {
    var d = String(n || "").normalize("NFKC").replace(/\D/g, "");
    if (d.indexOf("00") === 0) d = d.slice(2);
    if (d.length === 9 && /^(?:7[0-8]|3[03])/.test(d)) d = "221" + d;
    return d.length >= 8 && d.length <= 15 ? d : "";
  }

  var api = { masquer: masquer, masquerExtrait: masquerExtrait, normaliserNumero: normaliserNumero, JETONS: J, VERSION: VERSION };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Masquage = api;
})(typeof self !== "undefined" ? self : this);
