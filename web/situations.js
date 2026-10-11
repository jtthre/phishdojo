/* Situations de sensibilisation PhishDojo Senegal.
 * Format : on decrit la situation, on propose trois reflexes, on explique le bon et on nomme
 * la methode. Aucun message frauduleux n'est reproduit. Wolof : premiere version a faire relire
 * (docs/RELECTURE_WOLOF.md). `tech` reprend la taxonomie de la base quand elle s'applique. */
window.PDS_SITUATIONS = [
  {
    id: "code-annulation", tech: "code_annulation",
    methode: { fr: "Faux code d'annulation", wo: "Code d'annulation bu dul dëgg" },
    scene: {
      fr: "Un SMS annonce un dépôt d'argent sur votre compte. Juste après, quelqu'un appelle : il dit s'être trompé de numéro et vous demande de taper un « code d'annulation » pour récupérer sa somme.",
      wo: "Ab SMS wax na ne dugg na xaalis ci sa compte. Ci kanam, kenn woo la : mu ne dafa juum nimero, te mu ñaan nga bind ab « code d'annulation » ngir mu jot xaalisam."
    },
    choix: [
      { fr: "Taper le code pour lui rendre service", wo: "Bind code bi ngir dimbali ko" },
      { fr: "Vérifier mon solde dans l'application officielle, sans taper aucun code", wo: "Seet sama solde ci application bu wóor bi, te duma bind benn code" },
      { fr: "Lui renvoyer la somme par un autre moyen", wo: "Yónne ko xaalis bi ci beneen yoon" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Le « code d'annulation » est en réalité un code de retrait ou de transfert : en le tapant, vous videz votre propre compte. Un dépôt se vérifie dans l'application, et une vraie erreur se règle avec le service client, jamais par un code donné au téléphone.",
      wo: "« Code d'annulation » bi, code retrait walla transfert la : boo ko bindee, sa compte nga koy dindi. Dépôt dañu koy seet ci application bi, te njuumte bu dëgg, service client moo koy defar, du ab code boo joxe ci telefon."
    }
  },
  {
    id: "faux-agent", tech: "faux_agent",
    methode: { fr: "Faux service client", wo: "Service client bu dul dëgg" },
    scene: {
      fr: "Un appelant se présente comme agent du service client de votre mobile money. Il parle d'une faille de sécurité sur votre compte et vous demande votre code secret pour « le protéger ».",
      wo: "Kenn woo la, ne agent service client bu sa mobile money la. Mu wax ci ab njàqare ci sa compte, te mu laaj sa code bu kumpa ngir « aar ko »."
    },
    choix: [
      { fr: "Raccrocher, puis appeler moi-même le service client depuis l'application officielle", wo: "Dagg woote bi, te ma woo service client bi ci application bu wóor bi" },
      { fr: "Lui donner le code, puisqu'il veut protéger mon compte", wo: "Jox ko code bi, ndax dafa bëgg aar sama compte" },
      { fr: "Lui donner seulement la moitié du code", wo: "Jox ko genn-wàll bu code bi rekk" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Aucun service client ne demande jamais votre code secret. L'escroc se fait passer pour une autorité de confiance pour vous faire baisser la garde. Rappelez vous-même le numéro affiché dans l'application.",
      wo: "Benn service client du la mës a laaj sa code bu kumpa. Naxkat bi dafay def ni dafa am sañ-sañ ngir nga woyofal sa bopp. Yaw ci sa bopp woowal nimero bi nekk ci application bi."
    }
  },
  {
    id: "faux-gain", tech: "faux_gain",
    methode: { fr: "Faux gain", wo: "Xéewal bu dul dëgg" },
    scene: {
      fr: "Un SMS vous félicite : vous auriez gagné à une tombola d'un opérateur. Pour recevoir le lot, il faut payer des « frais de dossier » ou ouvrir un lien.",
      wo: "Ab SMS ne la ndokkale : nga ne dañu la jox ci ab tombola bu opérateur. Ngir jot sa xéewal, nga fey « frais de dossier » walla ubbi ab lien."
    },
    choix: [
      { fr: "Payer les frais, ils sont petits par rapport au lot", wo: "Fey frais yi, ndax tuuti nañu" },
      { fr: "Ouvrir le lien juste pour voir", wo: "Ubbi lien bi ngir seet rekk" },
      { fr: "Ignorer, vérifier sur les canaux officiels de l'opérateur, puis signaler", wo: "Bàyyi ko, seet ci yoonu opérateur bi yu wóor, te yëgal ko" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "On ne gagne pas à un jeu auquel on n'a pas participé, et un vrai gain ne coûte jamais de frais. Les frais sont l'arnaque, et le lien sert à voler vos identifiants.",
      wo: "Kenn du jot ci po bu mu bokkul, te xéewal bu dëgg du laaj frais. Frais yi ñooy naxe bi, te lien bi ngir sàcc sa xibaar."
    }
  },
  {
    id: "trop-percu", tech: "trop_percu",
    methode: { fr: "Faux « envoi par erreur »", wo: "« Yónne naa la ci njuumte » bu dul dëgg" },
    scene: {
      fr: "Vous recevez un petit transfert d'un inconnu. Peu après, il vous écrit qu'il a envoyé beaucoup plus par erreur et vous demande de lui renvoyer la différence.",
      wo: "Am nga xaalis bu tuuti bu kenn ku nga xamul yónne. Ci kanam, mu bind la ne dafa yónne lu ëpp ci njuumte, te mu ñaan nga delloo ko li ëpp."
    },
    choix: [
      { fr: "Vérifier le montant réel dans l'historique de l'application et laisser le service client gérer", wo: "Seet xaalis bi dugg ci historique bu application bi, te bàyyi service client bi mu saytu" },
      { fr: "Lui renvoyer la différence qu'il annonce", wo: "Delloo ko li mu wax ne ëpp na" },
      { fr: "Renvoyer tout de suite la somme au numéro qu'il vous donne", wo: "Yónne léegi xaalis bi ci nimero bi mu la jox" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "La « différence » n'existe pas : seul le petit montant est arrivé. Une vraie erreur se corrige par le service client, qui annule la transaction, pas par vous.",
      wo: "« Li ëpp » amul : xaalis bu tuuti bi rekk moo dugg. Njuumte bu dëgg, service client moo koy neenal, du yaw."
    }
  },
  {
    id: "faux-fournisseur", tech: "faux_fournisseur",
    methode: { fr: "Faux fournisseur", wo: "Fournisseur bu dul dëgg" },
    scene: {
      fr: "Votre commerce reçoit un message d'un numéro inconnu qui se présente comme votre fournisseur habituel. Il a « changé de numéro » et réclame un paiement urgent pour une commande.",
      wo: "Sa bitig jot na bataaxal ci nimero bu nga xamul, ku ne sa fournisseur bu yàgg la. Mu ne « soppi na nimero » te mu laaj nga fey léegi ab commande."
    },
    choix: [
      { fr: "Payer au nouveau numéro pour ne pas perdre la commande", wo: "Fey ci nimero bu bees bi ngir commande bi bañ a réer" },
      { fr: "Demander une photo de la facture, puis payer", wo: "Laaj nataalu facture bi, te fey" },
      { fr: "Appeler le fournisseur sur son numéro habituel pour confirmer", wo: "Woo fournisseur bi ci nimero bi mu daan jëfandikoo ngir wóoral" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "L'escroc joue sur la confiance et sur l'urgence. Un changement de numéro se confirme toujours par l'ancien canal, que vous connaissez. Une photo de facture se fabrique en deux minutes.",
      wo: "Naxkat bi dafay jëfandikoo kóolute ak gaaw. Soppi nimero, dañu koy wóoral ci yoon wu yàgg wi nga xam. Nataalu facture, ci ñaari simili lañu koy defar."
    }
  },
  {
    id: "qr-code", tech: "qr_code",
    methode: { fr: "QR code détourné", wo: "QR code bu ñu soppi" },
    scene: {
      fr: "Dans une boutique, un autocollant QR code de paiement a été collé par-dessus celui du marchand. Une fois scanné, l'écran affiche un autre nom de bénéficiaire.",
      wo: "Ci ab bitig, ab QR code bu fey lañu taq ci kaw bu jaaykat bi. Boo ko scannee, ekraan bi dafay won beneen turu ki koy jot."
    },
    choix: [
      { fr: "Valider quand même, c'est le QR code de la boutique", wo: "Wóoral rekk, QR code bu bitig bi la" },
      { fr: "Vérifier le nom avec le marchand, ou saisir moi-même son code marchand", wo: "Seet tur wi ak jaaykat bi, walla bind sama loxo code marchand bi" },
      { fr: "Scanner une deuxième fois", wo: "Scanneewaat ko" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Un QR code cache sa destination. Le nom du bénéficiaire affiché avant de valider est le seul vrai indice : s'il ne correspond pas, on ne paie pas.",
      wo: "QR code dafay nëbb fu mu jëm. Turu ki koy jot bi feeñ balaa ngay wóoral, mooy firnde bi : su dëppoowul, doo fey."
    }
  },
  {
    id: "faux-emploi", tech: "faux_emploi",
    methode: { fr: "Fausse offre d'emploi", wo: "Liggéey bu dul dëgg" },
    scene: {
      fr: "Une annonce sur les réseaux sociaux promet un emploi bien payé, sans entretien. Pour « réserver la place », on vous demande des frais de formation et une copie de votre pièce d'identité.",
      wo: "Ab yéenekaay ci réseaux sociaux dafa digle ab liggéey bu fey bu baax, te amul entretien. Ngir « jël sa palaas », dañu la laaj frais formation ak ab copie bu sa kàrt identité."
    },
    choix: [
      { fr: "Vérifier que l'entreprise existe par ses canaux officiels, et ne jamais payer pour être embauché", wo: "Seet ndax entreprise bi am na ci yoon yu wóor, te mukk doo fey ngir ñu jël la" },
      { fr: "Payer vite pour ne pas perdre l'occasion", wo: "Fey léegi ngir bañ a ñàkk bii yoon" },
      { fr: "Envoyer d'abord la pièce d'identité, payer ensuite", wo: "Yónne kàrt identité bi jëkk, fey ci kanam" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Un employeur sérieux ne fait jamais payer un candidat. Les frais sont l'arnaque, et la pièce d'identité peut servir à usurper votre identité.",
      wo: "Kilifa liggéey bu dëgg du fey-loo ki di sàkku liggéey. Frais yi ñooy naxe bi, te sa kàrt identité mën nañu ko jëfandikoo ngir def ni yaw lañu."
    }
  },
  {
    id: "faux-colis", tech: "faux_colis",
    methode: { fr: "Faux colis", wo: "Colis bu dul dëgg" },
    scene: {
      fr: "Un SMS d'un prétendu livreur indique qu'un colis est bloqué. Il faut payer des frais de livraison par un lien, sous 24 heures.",
      wo: "Ab SMS bu kenn ku ne livreur la wax na ne ab colis dafa taxaw. War nga fey frais livraison ci ab lien, ci 24 waxtu."
    },
    choix: [
      { fr: "Payer par le lien, ce ne sont que des frais", wo: "Fey ci lien bi, frais rekk la" },
      { fr: "Répondre au SMS pour demander des détails", wo: "Tontu SMS bi ngir laaj leeral" },
      { fr: "Vérifier le suivi en tapant moi-même l'adresse officielle du transporteur, ou ignorer si je n'attends rien", wo: "Seet suivi bi, ma bind sama loxo adress bu wóor bu transporteur bi, walla bàyyi ko su ma xaarul dara" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "L'urgence et le lien sont les deux signaux. Le lien mène à une page qui vole vos coordonnées. Le vrai suivi se consulte en tapant soi-même l'adresse du transporteur.",
      wo: "Gaaw ak lien ñooy ñaari firnde yi. Lien bi dafay yóbbu ci xët wu sàcc sa xibaar. Suivi bu dëgg, yaw ci sa bopp nga koy bind adress bu transporteur bi."
    }
  },
  {
    id: "faux-placement", tech: "faux_placement",
    methode: { fr: "Faux placement", wo: "Placement bu dul dëgg" },
    scene: {
      fr: "Un contact vous propose de doubler votre argent en un mois grâce à un « placement » ou une tontine en ligne, captures d'écran de gains d'autres membres à l'appui.",
      wo: "Kenn ci say xarit dafa la digle nga ful sa xaalis ñaari yoon ci benn weer ci ab « placement » walla tontine ci internet, te mu won la nataal yu ñeneen ñu jot."
    },
    choix: [
      { fr: "Placer une petite somme pour tester", wo: "Def xaalis bu tuuti ngir jéem" },
      { fr: "Refuser : un rendement garanti aussi élevé n'existe pas, et demander conseil à ma banque", wo: "Bañ : ful bu mel noonu amul, te laaj sama banque" },
      { fr: "Inviter des amis pour partager le risque", wo: "Woo ay xarit ngir séddoo njàqare bi" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Un gain garanti et très élevé est le signe d'une pyramide : les premiers sont payés avec l'argent des suivants, puis tout s'effondre. Les captures de gains se fabriquent facilement.",
      wo: "Ful bu wóor te bari lool, firndeu pyramide la : ñi jëkk, xaalisu ñi topp lañu leen di fey, te lépp dafay daanu. Nataalu ful yi, dañu leen di defar ci yombal."
    }
  },
  {
    id: "faux-proche", tech: "autre",
    methode: { fr: "Faux proche", wo: "Mbokk bu dul dëgg" },
    scene: {
      fr: "Un proche vous écrit sur WhatsApp depuis un nouveau numéro : il a perdu son téléphone et a besoin d'argent tout de suite.",
      wo: "Ab mbokk bind na la ci WhatsApp ci nimero bu bees : ne réer na telefonam te soxla na xaalis léegi."
    },
    choix: [
      { fr: "Envoyer l'argent, il a l'air pressé", wo: "Yónne xaalis bi, dafa mel ni dafa gaaw" },
      { fr: "Envoyer la moitié pour l'aider un peu", wo: "Yónne genn-wàll ngir dimbali ko tuuti" },
      { fr: "L'appeler sur son ancien numéro, ou lui poser une question que lui seul connaît", wo: "Woo ko ci nimero bu yàgg bi, walla laaj ko lu mu rekk xam" }
    ],
    bonne: 2,
    pourquoi: {
      fr: "Usurper un proche marche bien parce qu'on veut aider vite. Vérifiez toujours par un autre canal avant d'envoyer quoi que ce soit.",
      wo: "Def ni ab mbokk la dafay yomb ndax danuy bëgg dimbali ci gaaw. Seetal ci beneen yoon balaa ngay yónne dara."
    }
  },
  {
    id: "code-verification", tech: "faux_agent",
    methode: { fr: "Vol de code de vérification", wo: "Sàcc code vérification" },
    scene: {
      fr: "Vous recevez par SMS un code de vérification que vous n'avez pas demandé. Un appelant dit s'être trompé et vous demande de lui lire ce code.",
      wo: "Am nga ci SMS ab code vérification bu nga laajul. Kenn woo la ne dafa juum, te mu ñaan nga jàngal ko code bi."
    },
    choix: [
      { fr: "Ne jamais le partager : changer mon mot de passe et prévenir mon opérateur", wo: "Mukk duma ko wax kenn : soppi sama mot de passe te yëgal sama opérateur" },
      { fr: "Lui lire le code, il s'est trompé", wo: "Jàngal ko code bi, dafa juum" },
      { fr: "Lui donner seulement les premiers chiffres", wo: "Jox ko ay chiffre yu jëkk rekk" }
    ],
    bonne: 0,
    pourquoi: {
      fr: "Ce code sert à prendre le contrôle d'un compte (WhatsApp, mobile money) ou de votre ligne. Le partager, c'est donner la clé. Un code reçu sans l'avoir demandé est une alerte.",
      wo: "Code bii, ngir jël sa compte (WhatsApp, mobile money) walla sa ligne la. Boo ko waxee, caabi ji nga joxe. Code boo jot te laajoo ko, ab artu la."
    }
  },
  {
    id: "faux-lien-maj", tech: "autre",
    methode: { fr: "Faux lien de mise à jour", wo: "Lien mise à jour bu dul dëgg" },
    scene: {
      fr: "Un message vous invite à « mettre à jour » votre compte mobile money sur une page web, sinon il sera bloqué aujourd'hui.",
      wo: "Ab bataaxal ne nga « mise à jour » sa compte mobile money ci ab xët web, lu ko moy dañu koy tëj tey."
    },
    choix: [
      { fr: "Faire la mise à jour par le lien avant le blocage", wo: "Def mise à jour bi ci lien bi balaa ñu koy tëj" },
      { fr: "Ouvrir directement l'application officielle : aucune mise à jour ne se fait par un lien reçu", wo: "Ubbi application bu wóor bi : benn mise à jour du jaar ci lien bu ñu la yónne" },
      { fr: "Appeler le numéro indiqué dans le message", wo: "Woo nimero bi nekk ci bataaxal bi" }
    ],
    bonne: 1,
    pourquoi: {
      fr: "Les mises à jour se font dans l'application officielle, jamais par un lien reçu. La menace de blocage sert à vous presser, et le numéro du message appartient lui aussi à l'escroc.",
      wo: "Mise à jour, ci application bu wóor bi lañu koy def, du ci lien bu ñu la yónne. Tëj bi ñu la tiitaloo, ngir nga gaaw la, te nimero bi ci bataaxal bi, bu naxkat bi la itam."
    }
  }
];
