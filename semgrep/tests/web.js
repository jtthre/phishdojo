// Cas de test des règles semgrep/regles/web.yml (semgrep --test). Code fictif, jamais exécuté.

function envois(url, corps) {
  // ruleid: pds-envoi-reseau-hors-signaler
  fetch(url, { method: "POST", body: corps });
  // ruleid: pds-envoi-reseau-hors-signaler
  window.fetch(url);
  // ruleid: pds-envoi-reseau-hors-signaler
  navigator.sendBeacon(url, corps);
  // ruleid: pds-envoi-reseau-hors-signaler
  var x = new XMLHttpRequest();
  // ruleid: pds-envoi-reseau-hors-signaler
  var ws = new WebSocket("wss://exemple.test/flux");
  // ruleid: pds-envoi-reseau-hors-signaler
  var img = new Image();
  // ruleid: pds-envoi-reseau-hors-signaler
  var s = document.createElement("script");
  // ruleid: pds-envoi-reseau-hors-signaler
  var w = new Worker("travail.js");
  // ok: pds-envoi-reseau-hors-signaler
  var p = document.createElement("p");
  // ok: pds-envoi-reseau-hors-signaler
  console.info("aucun envoi");
}

function affichage(champ, liste, lien, esc, P, e, resultat, lecteur) {
  var saisie = champ.value;
  // ruleid: pds-html-depuis-saisie
  liste.innerHTML = "<li>" + saisie + "</li>";
  // ruleid: pds-html-depuis-saisie
  liste.insertAdjacentHTML("beforeend", location.hash);
  // ruleid: pds-html-depuis-saisie
  liste.innerHTML = localStorage.getItem("pseudo");
  // ruleid: pds-html-depuis-saisie
  liste.innerHTML = resultat.data.text;
  // ruleid: pds-html-depuis-saisie
  lien.href = e.clipboardData.getData("text");
  // ruleid: pds-html-depuis-saisie
  lien.setAttribute("href", lecteur.result);
  // ok: pds-html-depuis-saisie
  liste.innerHTML = "<li>" + esc(saisie) + "</li>";
  // ok: pds-html-depuis-saisie
  liste.innerHTML = "<li>" + P.esc(champ.value) + "</li>";
  // ok: pds-html-depuis-saisie
  liste.textContent = saisie;
  // ok: pds-html-depuis-saisie
  liste.setAttribute("aria-label", "texte fixe");
  // ok: pds-html-depuis-saisie
  liste.innerHTML = "<li>texte fixe</li>";
}

function dynamique(code) {
  // ruleid: pds-code-dynamique
  eval(code);
  // ruleid: pds-code-dynamique
  var f = new Function("a", code);
  // ruleid: pds-code-dynamique
  setTimeout("alert(1)", 10);
  // ok: pds-code-dynamique
  setTimeout(function () { return 1; }, 10);
}
