/* Corpus de test : 100 messages ordinaires (notifications, messages personnels, livraisons)
 * truffes de donnees personnelles FICTIVES, dont on connait chaque valeur.
 * Aucun message n'imite une arnaque : on teste le masquage, pas la detection.
 * Generation deterministe (graine fixe) pour que le test soit reproductible en CI.
 */
"use strict";

function generateur(graine) {
  let s = graine >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Prenoms et noms presents dans les listes du masqueur...
const PRENOMS_CONNUS = ["Awa", "Moussa", "Fatou", "Ibrahima", "Aminata", "Cheikh", "Khady", "Ousmane", "Mariama", "Babacar"];
const NOMS_CONNUS = ["Diop", "Ndiaye", "Fall", "Sow", "Gueye", "Sarr", "Diallo", "Faye", "Mbaye", "Cissé"];
// ...et absents des listes, pour mesurer honnetement ce que les marqueurs rattrapent.
const PRENOMS_INCONNUS = ["Khadidiatou", "Mbissine", "Ngagne", "Nogaye", "Yérim", "Thierno", "Abdourahmane", "Matar", "Sokhoya", "Diéguène"];
const NOMS_INCONNUS = ["Mbacké", "Ndiongue", "Dièye", "Bakhoum", "Diène", "Ngaïdé", "Hanne", "Djigo", "Boye", "Ndir"];

function creerCorpus(n = 100, graine = 221) {
  const r = generateur(graine);
  const un = (t) => t[Math.floor(r() * t.length)];
  const chiffres = (k) => Array.from({ length: k }, () => Math.floor(r() * 10)).join("");

  function telephone() {
    const op = un(["77", "78", "76", "70", "75", "33"]);
    const c = chiffres(7);
    const local = op + c;
    const formes = [
      `${op} ${c.slice(0, 3)} ${c.slice(3, 5)} ${c.slice(5)}`,
      local,
      `+221 ${op} ${c.slice(0, 3)} ${c.slice(3, 5)} ${c.slice(5)}`,
      `00221${local}`,
      `+221-${op}-${c.slice(0, 3)}-${c.slice(3, 5)}-${c.slice(5)}`,
      `${op}.${c.slice(0, 3)}.${c.slice(3, 5)}.${c.slice(5)}`,
      `+33 6 ${chiffres(2)} ${chiffres(2)} ${chiffres(2)} ${chiffres(2)}`
    ];
    const brut = un(formes);
    return { brut, chiffres: brut.replace(/\D/g, "") };
  }
  function montant() {
    const v = (1 + Math.floor(r() * 400)) * 250;
    const milliers = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const formes = [`${milliers(v)}F`, `${milliers(v).replace(/ /g, ".")} FCFA`, `${v} F CFA`, `CFA ${milliers(v)}`,
                    `${milliers(v)} frs`, `${v} FCFA`];
    return { brut: un(formes), chiffres: String(v) };
  }
  function reference() {
    const L = () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(r() * 24)];
    const formes = [`CI${chiffres(6)}.${chiffres(4)}.${L()}${chiffres(5)}`, `PP${chiffres(4)}${L()}${chiffres(5)}`,
                    `TX-${chiffres(4)}-${L()}${L()}${chiffres(2)}`, `MP${chiffres(6)}.${chiffres(4)}.${L()}${chiffres(5)}`];
    return un(formes);
  }
  function code() {
    let c;
    do { c = chiffres(un([4, 5, 6])); } while (/^(19|20)\d\d$/.test(c) || c[0] === "0");
    return c;
  }
  function email(p, nom) {
    const norm = (x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return `${norm(p)}.${norm(nom)}${chiffres(2)}@${un(["gmail.com", "yahoo.fr", "hotmail.com", "orange.sn"])}`;
  }

  const MODELES = [
    // [fonction, categories de donnees personnelles presentes]
    () => { const p = un(PRENOMS_CONNUS), nm = un(NOMS_CONNUS), t = telephone(), m = montant(), ref = reference();
      return { texte: `Vous avez reçu ${m.brut} de ${p.toUpperCase()} ${nm.toUpperCase()} (${t.brut}). Ref: ${ref}`,
        pii: { tel: [t], montant: [m], ref: [ref], nom: [p, nm] } }; },
    () => { const p = un(PRENOMS_INCONNUS), nm = un(NOMS_INCONNUS), t = telephone(), m = montant();
      return { texte: `Transfert de ${m.brut} à ${p} ${nm} ${t.brut} effectué avec succès.`,
        pii: { tel: [t], montant: [m], nom_marqueur: [p, nm] } }; },
    () => { const p = un(PRENOMS_CONNUS), c = code();
      return { texte: `Bonjour ${p}, votre code de vérification est ${c}. Il expire dans 10 minutes.`,
        pii: { code: [c], nom: [p] } }; },
    () => { const p = un(PRENOMS_INCONNUS), nm = un(NOMS_INCONNUS), e = email(p, nm), t = telephone();
      return { texte: `Écris-moi à ${e} ou appelle le ${t.brut} ce soir.`, pii: { email: [e], tel: [t] } }; },
    () => { const p = un(PRENOMS_CONNUS), nm = un(NOMS_CONNUS), m = montant();
      return { texte: `Rendez-vous chez ${p} ${nm} demain matin, prévois ${m.brut} pour le transport.`,
        pii: { montant: [m], nom: [p, nm] } }; },
    () => { const p = un(PRENOMS_INCONNUS), nm = un(NOMS_INCONNUS), ref = reference(), t = telephone();
      return { texte: `Colis ${ref} pour M. ${nm}. Suivi : https://suivi-colis.top/c/${ref.replace(/[^A-Z0-9]/g, "")}?tel=${t.chiffres}`,
        pii: { ref: [ref], tel: [t], nom_marqueur: [nm] } }; },
    () => { const p = un(PRENOMS_CONNUS), t = telephone();
      return { texte: `Mangi ci kër ${p}, woo ma ci ${t.brut} bu la neexee.`, pii: { tel: [t], nom: [p] } }; },
    () => { const m = montant(), ref = reference(), c = code();
      return { texte: `Solde : ${m.brut}. Réf. ${ref}. Code de retrait ${c}.`, pii: { montant: [m], ref: [ref], code: [c] } }; },
    () => { const p = un(PRENOMS_INCONNUS), m = montant();
      return { texte: `${p} m'a dit de t'envoyer ${m.brut} avant vendredi.`, pii: { montant: [m], nom_libre: [p] } }; },
    () => { const p = un(PRENOMS_INCONNUS), nm = un(NOMS_INCONNUS), e = email(p, nm);
      return { texte: `Madame ${p} ${nm} vous attend à l'accueil. Contact : ${e}`,
        pii: { email: [e], nom_marqueur: [p, nm] } }; }
  ];

  const corpus = [];
  for (let i = 0; i < n; i++) corpus.push(MODELES[i % MODELES.length]());
  return corpus;
}

module.exports = { creerCorpus };
