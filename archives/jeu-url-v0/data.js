/* PhishDojo - contenu des defis.
   - Les adresses sont affichees en texte, jamais cliquables.
   - Les situations (mails, pieces jointes) decrivent un contexte et demandent le bon
     reflexe. Elles nomment la methode pour la faire connaitre, sans reproduire de message.
   - Les redirections / liens raccourcis vivent dans l'ecran « Sensibilisation », pas dans
     les defis notes. */

window.PD_DATA = {
  // Seuil du LightGBM pour 90 % de rappel, fixe en validation (rapport du 6 octobre 2026).
  aiThreshold: 0.6769,

  // ================================================================= LECTURE D'ADRESSES
  // Deux reponses : legitime ou imitation. Varie les techniques.
  urls: [
    // --- legitimes
    { url: "https://www.ameli.fr/assure/remboursements", reg: "ameli.fr", truth: "legit",
      fr: "Domaine enregistré : ameli.fr. Le vrai. Le « www » et le chemin ne changent rien.",
      en: "Registered domain: ameli.fr. The real one. The \"www\" and the path change nothing." },
    { url: "https://mon-compte.laposte.fr/connexion", reg: "laposte.fr", truth: "legit",
      fr: "« mon-compte » est un sous-domaine de laposte.fr, le vrai domaine. Un sous-domaine à gauche d'un domaine légitime appartient à ce domaine.",
      en: "\"mon-compte\" is a subdomain of laposte.fr, the real domain. A subdomain to the left of a legitimate domain belongs to it." },
    { url: "https://secure.paypal.com/fr/cgi-bin/webscr", reg: "paypal.com", truth: "legit",
      fr: "Des mots comme « secure » ou « webscr » font peur, mais le domaine reste paypal.com. Le vocabulaire du chemin n'est pas un indice.",
      en: "Words like \"secure\" or \"webscr\" look scary, but the domain is still paypal.com. Path wording is not a clue." },
    { url: "https://www.amazon.fr/gp/css/order-history?ie=UTF8&ref=nav", reg: "amazon.fr", truth: "legit",
      fr: "Longue, pleine de paramètres, mais le domaine est amazon.fr. La longueur n'est pas un indice.",
      en: "Long and full of parameters, but the domain is amazon.fr. Length is not a clue." },
    { url: "https://github.com/login?return_to=%2Fsettings", reg: "github.com", truth: "legit",
      fr: "Domaine : github.com. Le paramètre encodé (%2F = une barre) est normal, pas suspect.",
      en: "Domain: github.com. The encoded parameter (%2F = a slash) is normal, not suspicious." },
    { url: "https://www.service-public.fr/particuliers/vosdroits/F31267", reg: "service-public.fr", truth: "legit",
      fr: "service-public.fr, le vrai. Les tirets font partie du nom officiel ici.",
      en: "service-public.fr, the real one. The hyphens are part of the official name here." },
    { url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=4765", reg: "microsoftonline.com", truth: "legit",
      fr: "microsoftonline.com est le vrai domaine de connexion Microsoft. Oui, c'est le nom officiel, aussi étrange soit-il.",
      en: "microsoftonline.com is Microsoft's real sign-in domain. Yes, that's the official name, odd as it looks." },
    { url: "https://fr.wikipedia.org/wiki/Hame%C3%A7onnage", reg: "wikipedia.org", truth: "legit",
      fr: "wikipedia.org, le vrai. Les caractères encodés (%C3%A7 = ç) sont une façon normale d'écrire les accents dans une adresse.",
      en: "wikipedia.org, the real one. Encoded characters (%C3%A7 = ç) are a normal way to write accents in an address." },

    // --- imitations
    { url: "https://ameli.fr-remboursement.cfd/connexion", reg: "fr-remboursement.cfd", truth: "phish",
      fr: "Attention au point et au tiret : le vrai domaine est fr-remboursement.cfd. « ameli.fr- » n'est que le début d'un nom plus long.",
      en: "Watch the dot and the hyphen: the real domain is fr-remboursement.cfd. \"ameli.fr-\" is just the start of a longer name." },
    { url: "https://www.laposte.fr.colis-livraison.top/suivi", reg: "colis-livraison.top", truth: "phish",
      fr: "On lit de droite à gauche : le vrai domaine est colis-livraison.top. « laposte.fr » n'est qu'un préfixe posé devant.",
      en: "Read right to left: the real domain is colis-livraison.top. \"laposte.fr\" is just a prefix placed in front." },
    { url: "https://paypaI.com/fr/signin", reg: "paypaI.com", truth: "phish",
      fr: "Regardez bien : un I majuscule a remplacé le « l » de paypal. Dans beaucoup de polices, c'est invisible.",
      en: "Look closely: a capital I has replaced the \"l\" in paypal. In many fonts it's invisible." },
    { url: "https://www.amaz0n.fr/compte/verification", reg: "amaz0n.fr", truth: "phish",
      fr: "Le « o » d'amazon est un zéro. Un chiffre glissé dans un nom de marque est un signal classique.",
      en: "The \"o\" in amazon is a zero. A digit slipped into a brand name is a classic signal." },
    { url: "http://45.133.21.7/impots/connexion", reg: "45.133.21.7", truth: "phish",
      fr: "Une adresse IP à la place d'un nom de domaine : aucun service grand public ne vous envoie vers ça.",
      en: "An IP address instead of a domain name: no consumer service sends you there." },
    { url: "https://impots.gouv.fr.verification-fiscale.info/", reg: "verification-fiscale.info", truth: "phish",
      fr: "Le vrai domaine est verification-fiscale.info. Un nom en .gouv.fr ne peut jamais être suivi d'un autre domaine à sa droite.",
      en: "The real domain is verification-fiscale.info. A .gouv.fr name can never be followed by another domain to its right." },
    { url: "https://netflix-paiement.pages.dev/maj", reg: "pages.dev", truth: "phish",
      fr: "Hébergé sur pages.dev, une plateforme gratuite. Le début « netflix-paiement » est un nom que n'importe qui choisit.",
      en: "Hosted on pages.dev, a free platform. The \"netflix-paiement\" part is a name anyone can pick." },
    { url: "https://www.service-publlc.fr/vosdroits", reg: "service-publlc.fr", truth: "phish",
      fr: "« publlc » : deux L au lieu de « li ». Une lettre doublée qui imite un mot connu.",
      en: "\"publlc\": two L's instead of \"li\". A doubled letter imitating a known word." },
    { url: "https://www.ameli.fr@suivi-remboursement.top/", reg: "suivi-remboursement.top", truth: "phish",
      fr: "Le piège du @ : tout ce qui est écrit avant le @ est ignoré par le navigateur. La vraie destination est suivi-remboursement.top.",
      en: "The @ trick: everything before the @ is ignored by the browser. The real destination is suivi-remboursement.top." },
    { url: "https://secure-login.micros0ft.com/account", reg: "micros0ft.com", truth: "phish",
      fr: "Le « o » de microsoft est un zéro. Le « secure-login » au début ne fait qu'ajouter de la crédibilité.",
      en: "The \"o\" in microsoft is a zero. The \"secure-login\" prefix only adds false credibility." }
  ],

  // ================================================================= TOI CONTRE L'IA
  // Les 12 adresses de l'ablation, avec le score reel du LightGBM (rapport du 6 octobre 2026).
  duel: [
    { url: "https://app.letsdefend.io/login", reg: "letsdefend.io", truth: "legit", ai: 0.8592,
      fr: "Le vrai site de LetsDefend. L'IA se trompe : elle ne connaît pas cette marque, et « app » + « /login » + « .io » la font basculer.",
      en: "LetsDefend's real site. The AI is wrong: it doesn't know this brand, and \"app\" + \"/login\" + \".io\" tip it over." },
    { url: "https://app.letzdefend.io/login", reg: "letzdefend.io", truth: "phish", ai: 0.8592,
      fr: "Un « s » devenu « z ». Bon verdict de l'IA, mais au même score que le vrai site : elle n'a pas vu la différence.",
      en: "An \"s\" turned into a \"z\". The AI is right, but at the same score as the real site: it didn't see the difference." },
    { url: "https://github.com/login", reg: "github.com", truth: "legit", ai: 0.5140,
      fr: "Le vrai GitHub. L'IA hésite (0,51) mais reste sous son seuil.",
      en: "The real GitHub. The AI hesitates (0.51) but stays under its threshold." },
    { url: "https://githib.com/login", reg: "githib.com", truth: "phish", ai: 0.9737,
      fr: "« githib » : une lettre de différence avec une marque connue. L'IA l'attrape.",
      en: "\"githib\": one letter off a known brand. The AI catches it." },
    { url: "https://www.impots.gouv.fr/portail/particulier", reg: "impots.gouv.fr", truth: "legit", ai: 0.0226,
      fr: "Le vrai site des impôts. Le modèle public de référence le classait phishing à 100 % ; celui-ci non.",
      en: "The real French tax site. The public reference model flagged it at 100%; this one doesn't." },
    { url: "https://www.impots-gouv.fr/portail/particulier", reg: "impots-gouv.fr", truth: "phish", ai: 0.9883,
      fr: "Un tiret à la place du point : impots-gouv.fr n'a rien à voir avec l'administration.",
      en: "A hyphen instead of a dot: impots-gouv.fr has nothing to do with the administration." },
    { url: "https://accounts.google.com/signin/v2/identifier", reg: "google.com", truth: "legit", ai: 0.1432,
      fr: "La vraie page de connexion Google.",
      en: "Google's real sign-in page." },
    { url: "https://accounts.googIe.com/signin/v2/identifier", reg: "googIe.com", truth: "phish", ai: 0.9684,
      fr: "Un I majuscule à la place du l : invisible dans beaucoup de polices. L'IA le repère.",
      en: "A capital I instead of an l: invisible in many fonts. The AI spots it." },
    { url: "https://fr.wikipedia.org/wiki/Hameconnage", reg: "wikipedia.org", truth: "legit", ai: 0.0448,
      fr: "Le vrai Wikipédia.",
      en: "The real Wikipedia." },
    { url: "https://fr.wikipedla.org/wiki/Hameconnage", reg: "wikipedla.org", truth: "phish", ai: 0.0450,
      fr: "« wikipedla » : un i devenu un l. L'IA passe à côté : Wikipédia n'est pas dans sa liste de marques.",
      en: "\"wikipedla\": an i turned into an l. The AI misses it: Wikipedia isn't in its brand list." },
    { url: "https://www.service-public.fr/particuliers/vosdroits/R1281", reg: "service-public.fr", truth: "legit", ai: 0.0507,
      fr: "Le vrai service-public.fr.",
      en: "The real service-public.fr." },
    { url: "https://www.service-publlc.fr/particuliers/vosdroits/R1281", reg: "service-publlc.fr", truth: "phish", ai: 0.9919,
      fr: "« publlc » : deux l au lieu de « li ». L'IA l'attrape.",
      en: "\"publlc\": two l's instead of \"li\". The AI catches it." }
  ],

  // ================================================================= MAILS ET PIECES JOINTES
  // Decrire la situation, demander le bon reflexe. answer = index de la bonne reponse.
  situations: [
    { kind: "mail",
      tech: { fr: "L'urgence qui fait agir sans réfléchir", en: "Urgency that makes you act without thinking" },
      scene: { fr: "Un message au nom de votre banque annonce que votre compte sera suspendu dans 24 heures et vous presse de « confirmer vos informations » en cliquant sur un bouton.",
               en: "A message posing as your bank says your account will be suspended within 24 hours and pushes you to \"confirm your information\" by clicking a button." },
      choices: [
        { fr: "Cliquer vite pour éviter la suspension", en: "Click fast to avoid the suspension" },
        { fr: "Ne rien cliquer et ouvrir le site de la banque en tapant soi-même l'adresse", en: "Click nothing and open the bank's site by typing the address yourself" },
        { fr: "Répondre au message pour demander si c'est vrai", en: "Reply to the message to ask whether it's real" }
      ], answer: 1,
      why: { fr: "L'urgence est l'outil n°1 de l'hameçonnage : elle pousse à agir avant de réfléchir. Une banque ne menace pas de fermer un compte via un bouton dans un mail. On vérifie toujours en passant par le canal officiel qu'on connaît déjà.",
             en: "Urgency is phishing's number-one tool: it makes you act before thinking. A bank doesn't threaten to close an account through a button in an email. Always check through the official channel you already know." } },

    { kind: "mail",
      tech: { fr: "Le nom affiché ne prouve rien", en: "The display name proves nothing" },
      scene: { fr: "L'expéditeur affiche « Service Client Colis », mais l'adresse e-mail réelle, une fois dépliée, est une suite de lettres sur un domaine que vous ne reconnaissez pas.",
               en: "The sender shows \"Parcel Customer Service\", but the real email address, once expanded, is a string of letters on a domain you don't recognize." },
      choices: [
        { fr: "Faire confiance au nom affiché, il est clair", en: "Trust the display name, it's clear" },
        { fr: "Regarder l'adresse e-mail réelle derrière le nom avant toute action", en: "Check the real email address behind the name before doing anything" },
        { fr: "Ouvrir la pièce jointe pour en savoir plus", en: "Open the attachment to find out more" }
      ], answer: 1,
      why: { fr: "Le nom affiché se choisit librement ; seule l'adresse réelle compte. Sur ordinateur on survole le nom, sur mobile un appui long ou le dépliage de l'en-tête la révèle.",
             en: "The display name is freely chosen; only the real address matters. On a computer hover over the name; on mobile a long press or expanding the header reveals it." } },

    { kind: "mail",
      tech: { fr: "La pièce jointe inattendue", en: "The unexpected attachment" },
      scene: { fr: "Un expéditeur que vous ne connaissez pas vous envoie une pièce jointe nommée « facture_impayee.pdf », sans aucun contexte ni explication.",
               en: "A sender you don't know sends you an attachment named \"unpaid_invoice.pdf\", with no context or explanation." },
      choices: [
        { fr: "L'ouvrir tout de suite pour savoir de quoi il s'agit", en: "Open it right away to see what it is" },
        { fr: "Ne pas l'ouvrir et vérifier autrement si cette facture existe vraiment", en: "Don't open it and check another way whether the invoice is real" },
        { fr: "La transférer à un proche pour avoir son avis", en: "Forward it to someone for a second opinion" }
      ], answer: 1,
      why: { fr: "La pièce jointe inattendue est un des vecteurs les plus courants, et la curiosité est le piège. On ne l'ouvre pas : on vérifie l'existence de la facture auprès de l'organisme, par un canal officiel.",
             en: "The unexpected attachment is one of the most common vectors, and curiosity is the trap. Don't open it: verify the invoice with the organization through an official channel." } },

    { kind: "pdf",
      tech: { fr: "Le document qui demande d'« activer » quelque chose", en: "The document that asks you to \"enable\" something" },
      scene: { fr: "Un document s'ouvre et affiche un bandeau : « Document protégé — cliquez sur Activer la modification / Activer les macros pour afficher le contenu ».",
               en: "A document opens and shows a banner: \"Protected document — click Enable Editing / Enable Macros to view the content\"." },
      choices: [
        { fr: "Activer les macros, c'est juste pour afficher le document", en: "Enable macros, it's just to view the document" },
        { fr: "Fermer le document sans rien activer", en: "Close the document without enabling anything" },
        { fr: "Activer seulement la modification, pas les macros", en: "Enable editing only, not macros" }
      ], answer: 1,
      why: { fr: "Un vrai document n'a jamais besoin que vous activiez des macros pour être lu. Ce bandeau sert à exécuter un programme caché. Depuis une source non sûre, on ferme et on n'active jamais.",
             en: "A real document never needs you to enable macros to be read. That banner exists to run hidden code. From an untrusted source, close it and never enable anything." } },

    { kind: "pdf",
      tech: { fr: "Le QR code dans un document (quishing)", en: "The QR code inside a document (quishing)" },
      scene: { fr: "Un PDF se présente comme un avis de livraison et invite à scanner un QR code avec votre téléphone pour « régler des frais de livraison ».",
               en: "A PDF poses as a delivery notice and invites you to scan a QR code with your phone to \"pay delivery fees\"." },
      choices: [
        { fr: "Scanner le QR code avec le téléphone, c'est pratique", en: "Scan the QR code with the phone, it's convenient" },
        { fr: "Ne pas scanner et vérifier le suivi sur le site officiel du transporteur", en: "Don't scan, and check tracking on the carrier's official site" },
        { fr: "Scanner mais ne payer que quelques euros", en: "Scan but only pay a few euros" }
      ], answer: 1,
      why: { fr: "Le QR code déplace l'attaque vers le téléphone, souvent moins protégé, et cache l'adresse de destination. Un transporteur ne réclame pas de frais par QR code dans un PDF. On vérifie le suivi sur le site officiel.",
             en: "A QR code moves the attack to the phone, often less protected, and hides the destination address. A carrier doesn't demand fees via a QR code in a PDF. Check tracking on the official site." } },

    { kind: "mail",
      tech: { fr: "La demande de virement urgente", en: "The urgent transfer request" },
      scene: { fr: "Un message se présentant comme votre direction demande, en urgence et en toute confidentialité, de virer une somme à un nouveau fournisseur avant la fin de la journée.",
               en: "A message posing as your management asks, urgently and confidentially, to wire a sum to a new supplier before end of day." },
      choices: [
        { fr: "Exécuter le virement, la demande vient de la direction", en: "Make the transfer, the request comes from management" },
        { fr: "Vérifier de vive voix, par un canal connu, avant tout virement", en: "Verify in person or through a known channel before any transfer" },
        { fr: "Répondre au mail pour demander une confirmation écrite", en: "Reply to the email to ask for written confirmation" }
      ], answer: 1,
      why: { fr: "Urgence + confidentialité + nouvelles coordonnées bancaires est la signature de la fraude au virement. On confirme toujours un virement inhabituel par un canal indépendant (un numéro connu, en personne), jamais en répondant au mail, que l'attaquant contrôle.",
             en: "Urgency + confidentiality + new bank details is the signature of transfer fraud. Always confirm an unusual transfer through an independent channel (a known number, in person), never by replying to the email, which the attacker controls." } },

    { kind: "mail",
      tech: { fr: "La fausse page de connexion", en: "The fake sign-in page" },
      scene: { fr: "Un message vous invite à « vérifier votre boîte mail » via un lien, qui mène à une page demandant votre identifiant et votre mot de passe habituels.",
               en: "A message invites you to \"verify your mailbox\" via a link, leading to a page asking for your usual username and password." },
      choices: [
        { fr: "Saisir ses identifiants, la page ressemble à la vraie", en: "Enter your credentials, the page looks like the real one" },
        { fr: "Ne rien saisir et ouvrir le service en tapant soi-même son adresse", en: "Enter nothing and open the service by typing its address yourself" },
        { fr: "Saisir un faux mot de passe pour tester la page", en: "Enter a fake password to test the page" }
      ], answer: 1,
      why: { fr: "Une page peut copier à l'identique l'apparence d'un service. Le ressemblant ne prouve rien ; seule l'adresse compte. On n'entre jamais ses identifiants depuis un lien reçu : on ouvre le service soi-même.",
             en: "A page can copy a service's look exactly. Looking right proves nothing; only the address matters. Never enter credentials from a received link: open the service yourself." } },

    { kind: "mail",
      tech: { fr: "Le gain trop beau pour être vrai", en: "The prize too good to be true" },
      scene: { fr: "Un message annonce que vous avez gagné un lot, ou qu'un remboursement vous attend, à condition de « confirmer vos coordonnées » rapidement.",
               en: "A message says you've won a prize, or that a refund is waiting, provided you \"confirm your details\" quickly." },
      choices: [
        { fr: "Confirmer ses coordonnées pour recevoir le gain", en: "Confirm your details to receive the prize" },
        { fr: "Supprimer le message : un gain non joué n'existe pas", en: "Delete the message: a prize you never entered doesn't exist" },
        { fr: "Donner seulement son adresse, pas ses coordonnées bancaires", en: "Give only your address, not your bank details" }
      ], answer: 1,
      why: { fr: "On ne gagne pas à une loterie à laquelle on n'a pas joué, et un vrai remboursement ne se réclame pas en urgence par mail. L'appât sert à récolter vos données. On supprime.",
             en: "You don't win a lottery you never entered, and a real refund isn't claimed urgently by email. The bait exists to harvest your data. Delete it." } },

    { kind: "mail",
      tech: { fr: "Le SMS ou mail de « livraison » (smishing)", en: "The \"delivery\" text or email (smishing)" },
      scene: { fr: "Un SMS annonce qu'un colis est bloqué et qu'une petite somme (quelques euros) est à régler via un lien pour le libérer.",
               en: "A text says a parcel is held and a small sum (a few euros) must be paid via a link to release it." },
      choices: [
        { fr: "Payer : la somme est minime, ça ne coûte presque rien", en: "Pay: the amount is tiny, it costs almost nothing" },
        { fr: "Ne pas cliquer et vérifier avec le numéro de suivi sur le site du transporteur", en: "Don't click and check the tracking number on the carrier's site" },
        { fr: "Cliquer sur le lien juste pour voir la page", en: "Click the link just to see the page" }
      ], answer: 1,
      why: { fr: "La petite somme est un leurre : le but réel est votre numéro de carte, qui sera ensuite réutilisé. Un transporteur ne réclame pas de frais par lien dans un SMS. On vérifie avec le numéro de suivi sur le site officiel.",
             en: "The small amount is a lure: the real goal is your card number, reused later. A carrier doesn't demand fees via a link in a text. Check the tracking number on the official site." } }
  ],

  // ================================================================= SENSIBILISATION (non noté)
  // Cartes explicatives, dont les redirections / liens raccourcis.
  sensi: [
    { icon: "link",
      title: { fr: "Les liens raccourcis et les redirections", en: "Short links and redirections" },
      body: { fr: "Un lien raccourci (bit.ly, t.co…) ou un lien de suivi cache sa vraie destination : impossible de la juger à l'œil. Un lien peut aussi en ouvrir un autre en chaîne. On ne clique pas pour « voir » : on passe la souris dessus pour lire l'aperçu, ou on copie le lien dans un vérificateur d'URL. Dans le doute, on va au service directement.",
              en: "A short link (bit.ly, t.co…) or a tracking link hides its real destination: you can't judge it by eye. A link can also open another in a chain. Don't click to \"see\": hover to read the preview, or paste the link into a URL checker. When in doubt, go to the service directly." } },
    { icon: "eye",
      title: { fr: "Le domaine se lit de droite à gauche", en: "A domain reads right to left" },
      body: { fr: "Le vrai propriétaire d'une adresse est le dernier nom juste avant la première barre « / ». Dans laposte.fr.colis.top/suivi, ce n'est pas laposte.fr, c'est colis.top. Tout ce qui est à gauche peut être inventé.",
              en: "The real owner of an address is the last name just before the first slash \"/\". In laposte.fr.colis.top/suivi it isn't laposte.fr, it's colis.top. Everything to the left can be made up." } },
    { icon: "shield",
      title: { fr: "HTTPS et le cadenas ne prouvent rien", en: "HTTPS and the padlock prove nothing" },
      body: { fr: "Le cadenas signifie seulement que la connexion est chiffrée, pas que le site est honnête. La plupart des sites de phishing ont aujourd'hui un cadenas. C'est le nom de domaine qu'il faut lire, pas le cadenas.",
              en: "The padlock only means the connection is encrypted, not that the site is honest. Most phishing sites have a padlock today. Read the domain name, not the padlock." } },
    { icon: "key",
      title: { fr: "La double authentification (2FA)", en: "Two-factor authentication (2FA)" },
      body: { fr: "Activez la double authentification partout où c'est possible. Même si un mot de passe est volé, elle ajoute une barrière. Attention : ne communiquez jamais un code reçu par SMS à quelqu'un qui vous appelle, un service ne le demande jamais.",
              en: "Turn on two-factor authentication wherever possible. Even if a password is stolen, it adds a barrier. Caution: never give a code received by text to someone who calls you; a real service never asks for it." } },
    { icon: "flag",
      title: { fr: "En cas de doute ou d'erreur", en: "If in doubt, or after a slip" },
      body: { fr: "Si vous avez cliqué ou saisi un mot de passe : changez-le immédiatement, prévenez l'organisme concerné, et surveillez vos comptes. Signaler protège aussi les autres.",
              en: "If you clicked or entered a password: change it immediately, warn the organization, and watch your accounts. Reporting also protects others." } }
  ],

  // Ressources officielles (ecran Sensibilisation et fin de partie).
  ressources: [
    { href: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/fiches-reflexes/hameconnage-phishing",
      fr: "Hameçonnage : la fiche réflexe de Cybermalveillance.gouv.fr",
      en: "Phishing: the Cybermalveillance.gouv.fr reflex sheet (French)" },
    { href: "https://www.signal-spam.fr/",
      fr: "Signaler un mail suspect : Signal Spam",
      en: "Report a suspicious email in France: Signal Spam" },
    { href: "https://www.33700.fr/",
      fr: "Signaler un SMS suspect : le 33700",
      en: "Report a suspicious text in France: 33700" }
  ]
};
