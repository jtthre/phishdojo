/* PhishDojo Senegal - page « Ou signaler » : seules les listes dependent de la langue. */
(function () {
  "use strict";
  var P = window.PDS;
  P.surLangue(function (t) {
    document.getElementById("now").innerHTML = t.osNow.map(function (x) { return "<li>" + P.esc(x) + "</li>"; }).join("");
  });
  P.demarrer();
})();
