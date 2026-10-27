/* PhishDojo - page « Le modèle » : contenu en français seulement ; en wolof, une note le dit. */
(function () {
  "use strict";
  var P = window.PDS;
  P.surLangue(function (t) {
    document.getElementById("note-langue").hidden = t.lang === "fr";
  });
  P.demarrer();
})();
