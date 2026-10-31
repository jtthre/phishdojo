/* Situations de sensibilisation PhishDojo Senegal.
 * Format : on decrit la situation, on propose trois reflexes, on explique le bon et on nomme
 * la methode. Aucun message frauduleux n'est reproduit. Textes en francais (le wolof ecrit a ete
 * retire le 31 octobre 2026). `tech` reprend la taxonomie de la base quand elle s'applique. */
window.PDS_SITUATIONS = [
  {
    id: "code-annulation", tech: "code_annulation",
    methode: { fr: "Faux code d'annulation" },
    scene: {
      fr: "Un SMS annonce un dépôt d'argent sur votre compte. Juste après, quelqu'un appelle : il dit s'être trompé de numéro et vous demande de taper un « code d'annulation » pour récupérer sa somme."
    },
    choix: [
      { fr: "Taper le code pour lui rendre service" },
      { fr: "Vérifier mon solde dans l'application officielle, sans taper aucun code" },
      { fr: "Lui renvoyer la somme par un autre moyen" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Le « code d'annulation » est en réalité un code de retrait ou de transfert : en le tapant, vous videz votre propre compte. Un dépôt se vérifie dans l'application, et une vraie erreur se règle avec le service client, jamais par un code donné au téléphone."
    }
  },
  {
    id: "faux-agent", tech: "faux_agent",
    methode: { fr: "Faux service client" },
    scene: {
      fr: "Un appelant se présente comme agent du service client de votre mobile money. Il parle d'une faille de sécurité sur votre compte et vous demande votre code secret pour « le protéger »."
    },
    choix: [
      { fr: "Raccrocher, puis appeler moi-même le service client depuis l'application officielle" },
      { fr: "Lui donner le code, puisqu'il veut protéger mon compte" },
      { fr: "Lui donner seulement la moitié du code" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Aucun service client ne demande jamais votre code secret. L'escroc se fait passer pour une autorité de confiance pour vous faire baisser la garde. Rappelez vous-même le numéro affiché dans l'application."
    }
  },
  {
    id: "faux-gain", tech: "faux_gain",
    methode: { fr: "Faux gain" },
    scene: {
      fr: "Un SMS vous félicite : vous auriez gagné à une tombola d'un opérateur. Pour recevoir le lot, il faut payer des « frais de dossier » ou ouvrir un lien."
    },
    choix: [
      { fr: "Payer les frais, ils sont petits par rapport au lot" },
      { fr: "Ouvrir le lien juste pour voir" },
      { fr: "Ignorer, vérifier sur les canaux officiels de l'opérateur, puis signaler" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "On ne gagne pas à un jeu auquel on n'a pas participé, et un vrai gain ne coûte jamais de frais. Les frais sont l'arnaque, et le lien sert à voler vos identifiants."
    }
  },
  {
    id: "trop-percu", tech: "trop_percu",
    methode: { fr: "Faux « envoi par erreur »" },
    scene: {
      fr: "Vous recevez un petit transfert d'un inconnu. Peu après, il vous écrit qu'il a envoyé beaucoup plus par erreur et vous demande de lui renvoyer la différence."
    },
    choix: [
      { fr: "Vérifier le montant réel dans l'historique de l'application et laisser le service client gérer" },
      { fr: "Lui renvoyer la différence qu'il annonce" },
      { fr: "Renvoyer tout de suite la somme au numéro qu'il vous donne" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "La « différence » n'existe pas : seul le petit montant est arrivé. Une vraie erreur se corrige par le service client, qui annule la transaction, pas par vous."
    }
  },
  {
    id: "faux-fournisseur", tech: "faux_fournisseur",
    methode: { fr: "Faux fournisseur" },
    scene: {
      fr: "Votre commerce reçoit un message d'un numéro inconnu qui se présente comme votre fournisseur habituel. Il a « changé de numéro » et réclame un paiement urgent pour une commande."
    },
    choix: [
      { fr: "Payer au nouveau numéro pour ne pas perdre la commande" },
      { fr: "Demander une photo de la facture, puis payer" },
      { fr: "Appeler le fournisseur sur son numéro habituel pour confirmer" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "L'escroc joue sur la confiance et sur l'urgence. Un changement de numéro se confirme toujours par l'ancien canal, que vous connaissez. Une photo de facture se fabrique en deux minutes."
    }
  },
  {
    id: "qr-code", tech: "qr_code",
    methode: { fr: "QR code détourné" },
    scene: {
      fr: "Dans une boutique, un autocollant QR code de paiement a été collé par-dessus celui du marchand. Une fois scanné, l'écran affiche un autre nom de bénéficiaire."
    },
    choix: [
      { fr: "Valider quand même, c'est le QR code de la boutique" },
      { fr: "Vérifier le nom avec le marchand, ou saisir moi-même son code marchand" },
      { fr: "Scanner une deuxième fois" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Un QR code cache sa destination. Le nom du bénéficiaire affiché avant de valider est le seul vrai indice : s'il ne correspond pas, on ne paie pas."
    }
  },
  {
    id: "faux-emploi", tech: "faux_emploi",
    methode: { fr: "Fausse offre d'emploi" },
    scene: {
      fr: "Une annonce sur les réseaux sociaux promet un emploi bien payé, sans entretien. Pour « réserver la place », on vous demande des frais de formation et une copie de votre pièce d'identité."
    },
    choix: [
      { fr: "Vérifier que l'entreprise existe par ses canaux officiels, et ne jamais payer pour être embauché" },
      { fr: "Payer vite pour ne pas perdre l'occasion" },
      { fr: "Envoyer d'abord la pièce d'identité, payer ensuite" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Un employeur sérieux ne fait jamais payer un candidat. Les frais sont l'arnaque, et la pièce d'identité peut servir à usurper votre identité."
    }
  },
  {
    id: "faux-colis", tech: "faux_colis",
    methode: { fr: "Faux colis" },
    scene: {
      fr: "Un SMS d'un prétendu livreur indique qu'un colis est bloqué. Il faut payer des frais de livraison par un lien, sous 24 heures."
    },
    choix: [
      { fr: "Payer par le lien, ce ne sont que des frais" },
      { fr: "Répondre au SMS pour demander des détails" },
      { fr: "Vérifier le suivi en tapant moi-même l'adresse officielle du transporteur, ou ignorer si je n'attends rien" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "L'urgence et le lien sont les deux signaux. Le lien mène à une page qui vole vos coordonnées. Le vrai suivi se consulte en tapant soi-même l'adresse du transporteur."
    }
  },
  {
    id: "faux-placement", tech: "faux_placement",
    methode: { fr: "Faux placement" },
    scene: {
      fr: "Un contact vous propose de doubler votre argent en un mois grâce à un « placement » ou une tontine en ligne, captures d'écran de gains d'autres membres à l'appui."
    },
    choix: [
      { fr: "Placer une petite somme pour tester" },
      { fr: "Refuser : un rendement garanti aussi élevé n'existe pas, et demander conseil à ma banque" },
      { fr: "Inviter des amis pour partager le risque" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Un gain garanti et très élevé est le signe d'une pyramide : les premiers sont payés avec l'argent des suivants, puis tout s'effondre. Les captures de gains se fabriquent facilement."
    }
  },
  {
    id: "faux-proche", tech: "autre",
    methode: { fr: "Faux proche" },
    scene: {
      fr: "Un proche vous écrit sur WhatsApp depuis un nouveau numéro : il a perdu son téléphone et a besoin d'argent tout de suite."
    },
    choix: [
      { fr: "Envoyer l'argent, il a l'air pressé" },
      { fr: "Envoyer la moitié pour l'aider un peu" },
      { fr: "L'appeler sur son ancien numéro, ou lui poser une question que lui seul connaît" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "Usurper un proche marche bien parce qu'on veut aider vite. Vérifiez toujours par un autre canal avant d'envoyer quoi que ce soit."
    }
  },
  {
    id: "code-verification", tech: "faux_agent",
    methode: { fr: "Vol de code de vérification" },
    scene: {
      fr: "Vous recevez par SMS un code de vérification que vous n'avez pas demandé. Un appelant dit s'être trompé et vous demande de lui lire ce code."
    },
    choix: [
      { fr: "Ne jamais le partager : changer mon mot de passe et prévenir mon opérateur" },
      { fr: "Lui lire le code, il s'est trompé" },
      { fr: "Lui donner seulement les premiers chiffres" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Ce code sert à prendre le contrôle d'un compte (WhatsApp, mobile money) ou de votre ligne. Le partager, c'est donner la clé. Un code reçu sans l'avoir demandé est une alerte."
    }
  },
  {
    id: "faux-lien-maj", tech: "autre",
    methode: { fr: "Faux lien de mise à jour" },
    scene: {
      fr: "Un message vous invite à « mettre à jour » votre compte mobile money sur une page web, sinon il sera bloqué aujourd'hui."
    },
    choix: [
      { fr: "Faire la mise à jour par le lien avant le blocage" },
      { fr: "Ouvrir directement l'application officielle : aucune mise à jour ne se fait par un lien reçu" },
      { fr: "Appeler le numéro indiqué dans le message" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Les mises à jour se font dans l'application officielle, jamais par un lien reçu. La menace de blocage sert à vous presser, et le numéro du message appartient lui aussi à l'escroc."
    }
  }
];
