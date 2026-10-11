# Relecture du wolof

Les textes wolof de l'interface et des situations sont une première version. **Ils doivent être relus par au moins deux locuteurs natifs avant l'ouverture de la collecte au public** (docs/AVANT_OUVERTURE.md).

Pour chaque ligne : corriger le wolof directement dans `web/i18n.js` ou `web/situations.js`, puis écrire « OK » (ou les initiales des relecteurs) dans la colonne « Relu ». Ce fichier se régénère avec `node scripts/relecture-wolof.js` sans perdre la colonne « Relu ».

Points d'attention :

- rester simple et oral : la page vise tout le monde, pas seulement les personnes à l'aise à l'écrit ;
- garder en français les mots que tout le monde emploie déjà ainsi (SMS, WhatsApp, QR code, Wave, Orange Money) ;
- vérifier que le sens de la case de consentement et des bons réflexes est exactement le même qu'en français.

Lignes restant à relire : **194 sur 194**.

| Clé | Français | Wolof (proposition) | Relu |
| --- | --- | --- | --- |
| `brand` | PhishDojo Sénégal | PhishDojo Sénégal |  |
| `testBanner` | Version de test : la collecte n'est pas encore ouverte au public. | Version test la : ubbeegul ngir ñépp. |  |
| `title` | Signaler une arnaque | Yëgal ab naxe |  |
| `lead` | Vous avez reçu un SMS, un message WhatsApp ou un appel suspect ? Partagez-le ici pour aider à protéger tout le monde. Le message est masqué sur votre téléphone avant d'être envoyé. | Am nga SMS, bataaxal WhatsApp walla woote bu la jaaxal ? Yónne ko fii ngir nu gën a aar ñépp. Bataaxal bi dañu koy nëbb ci sa telefon balaa ñu koy yónne. |  |
| `seal` | Masqué sur votre téléphone avant l'envoi | Dañu koy nëbb ci sa telefon balaa ñu koy yónne |  |
| `s1` | 1. Le message | 1. Bataaxal bi |  |
| `msgLabel` | Copiez-collez le message reçu | Duggal bataaxal bi nga jot |  |
| `msgPh` | Collez le message ici… | Duggal bataaxal bi fii… |  |
| `ocrBtn` | Ou importer une capture d'écran | Walla yebal ab nataal (capture) |  |
| `ocrHint` | Le texte est lu sur votre appareil. L'image n'est jamais envoyée. | Ci sa telefon lañuy jàng mbind mi. Nataal bi duñu ko yónne. |  |
| `ocrLoading` | Lecture de la capture… | Mangiy jàng nataal bi… |  |
| `ocrDone` | Texte extrait. Vérifiez-le ci-dessous. | Mbind mi génn na. Seetal ko ci suuf. |  |
| `ocrFail` | Impossible de lire la capture. Copiez le texte à la main. | Mënuñu jàng nataal bi. Bindal mbind mi ak sa loxo. |  |
| `canal` | Reçu par | Fan nga ko jote |  |
| `canaux.sms` | SMS | SMS |  |
| `canaux.whatsapp` | WhatsApp | WhatsApp |  |
| `canaux.appel` | Appel | Woote |  |
| `canaux.email` | E-mail | E-mail |  |
| `canaux.reseau_social` | Réseau social | Réseau social |  |
| `canaux.autre` | Autre | Leneen |  |
| `marque` | Au nom de qui ? | Ci turu kan ? |  |
| `marques.wave` | Wave | Wave |  |
| `marques.orange_money` | Orange Money | Orange Money |  |
| `marques.free_money` | Mixx by Yas (ex-Free Money) | Mixx by Yas (Free Money) |  |
| `marques.wizall` | Wizall | Wizall |  |
| `marques.banque` | Une banque | Ab banque |  |
| `marques.operateur` | Un opérateur téléphonique | Ab opérateur |  |
| `marques.administration` | Une administration | Ab administration |  |
| `marques.livraison` | Un livreur | Ab livreur |  |
| `marques.autre` | Autre | Leneen |  |
| `marques.aucune` | Personne en particulier | Kenn |  |
| `langue` | Langue du message | Làkk wi |  |
| `langues.fr` | Français | Faransee |  |
| `langues.wo` | Wolof | Wolof |  |
| `langues.fr_wo` | Français et wolof mélangés | Faransee ak wolof |  |
| `langues.autre` | Autre | Leneen |  |
| `recu` | Reçu le | Bés bi nga ko jote |  |
| `mode` | Ça ressemble à… (facultatif) | Mel na ni… (su la neexee) |  |
| `modes.code_annulation` | Un faux code d'annulation | Code d'annulation bu dul dëgg |  |
| `modes.faux_agent` | Un faux agent ou service client | Agent walla service client bu dul dëgg |  |
| `modes.faux_gain` | Un faux gain ou une loterie | Tombola walla xéewal bu dul dëgg |  |
| `modes.trop_percu` | Un faux « envoi par erreur » | « Yónne naa la xaalis ci njuumte » |  |
| `modes.faux_fournisseur` | Un faux fournisseur ou client pressé | Fournisseur walla kiliyaan buy gaaw |  |
| `modes.qr_code` | Un QR code à scanner | QR code bu ñu la ñaan nga scanner |  |
| `modes.faux_emploi` | Une fausse offre d'emploi | Liggéey bu dul dëgg |  |
| `modes.faux_colis` | Un faux colis ou une fausse livraison | Colis bu dul dëgg |  |
| `modes.faux_placement` | Un faux placement d'argent | Placement xaalis bu dul dëgg |  |
| `modes.autre` | Autre chose | Leneen |  |
| `modes.ne_sait_pas` | Je ne sais pas | Xamuma |  |
| `exp` | Numéro de l'expéditeur (facultatif) | Nimero bi ko yónne (su la neexee) |  |
| `expHint` | Il n'est jamais enregistré : le serveur le transforme en empreinte, pour repérer un même escroc signalé plusieurs fois, puis l'efface. | Duñu ko denc : serveur bi dafay def ab màndarga ngir xam ndax kenn ki lañu yëgal ay yoon, te far ko. |  |
| `s2` | 2. Vérifiez ce qui sera envoyé | 2. Seetal li ñuy yónne |  |
| `s2lead` | Les éléments surlignés ont été masqués. S'il reste un nom ou une information personnelle, sélectionnez-le puis touchez « Masquer la sélection ». | Li ñu melal, nëbb nañu ko. Su des ab tur walla lenn lu la jëm, tànnal ko te bësal « Nëbb li nga tànn ». |  |
| `previewEmpty` | L'aperçu apparaît ici dès que vous collez un message. | Fii lay feeñ bu nga duggalee bataaxal bi. |  |
| `maskSel` | Masquer la sélection | Nëbb li nga tànn |  |
| `undo` | Annuler | Dellu ginnaaw |  |
| `domains` | Liens repérés, conservés pour l'analyse : | Lien yi ñu gis, dañu leen denc ngir saytu : |  |
| `s3` | 3. Envoyer | 3. Yónne |  |
| `consent` | J'accepte que ce message masqué serve à étudier les arnaques, à entraîner un outil de détection et à être publié sous forme anonymisée. | Nangu naa ñu jëfandikoo bataaxal bii ñu nëbb ngir xam naxe yi, jàngal ab jumtukaay buy feeñal naxe, te siiwal ko te kenn du ko xam. |  |
| `adult` | J'ai 18 ans ou plus. | Am naa 18 at walla lu ko ëpp. |  |
| `send` | Envoyer le signalement | Yónne yëgal bi |  |
| `sending` | Envoi… | Mangiy yónne… |  |
| `errShort` | Le message est trop court (10 caractères minimum). | Bataaxal bi gàtt na lool (10 araf lu néew). |  |
| `errLong` | Le message est trop long (2 000 caractères maximum). | Bataaxal bi gudd na lool (2 000 araf lu ëpp). |  |
| `errBoxes` | Cochez les deux cases pour envoyer. | Tànnal ñaari kaase yi ngir yónne. |  |
| `errNet` | L'envoi a échoué. Vérifiez votre connexion et réessayez. | Yónne bi antuwul. Seetal sa connexion te jéemaat. |  |
| `thanks` | Merci, votre signalement est enregistré. | Jërëjëf, sa yëgal denc nañu ko. |  |
| `idLabel` | Votre identifiant de signalement : | Sa nimero yëgal : |  |
| `idHint` | Gardez-le : il suffit pour supprimer ce signalement à tout moment. | Denc ko : moo la may nga far yëgal bi saa su la neexee. |  |
| `copy` | Copier | Copier |  |
| `copied` | Copié | Copié na |  |
| `another` | Signaler un autre message | Yëgal beneen bataaxal |  |
| `demo` | Mode démonstration : aucun serveur n'est configuré, rien n'a été envoyé. Voici exactement ce qui serait parti : | Mode démonstration : amul serveur, dara yónnewul. Lii mooy li ñu doon yónne : |  |
| `delTitle` | Supprimer un signalement | Far ab yëgal |  |
| `delLabel` | Identifiant du signalement | Nimero yëgal |  |
| `delBtn` | Supprimer | Far |  |
| `delOk` | Signalement supprimé. | Far nañu yëgal bi. |  |
| `delNo` | Aucun signalement avec cet identifiant. | Amul yëgal bu am nimero boobu. |  |
| `delDemo` | Mode démonstration : rien à supprimer. | Mode démonstration : amul dara lu ñuy far. |  |
| `privacyTitle` | Vos données | Sa xibaar yu bopp |  |
| `privacy[0]` | Le message est masqué sur votre appareil avant l'envoi, puis une seconde fois par le serveur. | Bataaxal bi dañu koy nëbb ci sa telefon balaa ñu koy yónne, serveur bi nëbbaat ko. |  |
| `privacy[1]` | Sont conservés : le texte masqué, les liens, le canal, la marque citée, la langue et la date de réception. Aucune capture d'écran ni aucun numéro en clair n'est enregistré. | Li ñuy denc : mbind mi ñu nëbb, lien yi, fan nga ko jote, tur wi ñu jëfandikoo, làkk wi ak bés bi. Duñu denc nataal, duñu denc nimero. |  |
| `privacy[2]` | Les signalements sont conservés 24 mois au plus. Vous pouvez supprimer le vôtre à tout moment avec son identifiant. | Duñu denc yëgal yi lu ëpp 24 weer. Mën nga far sa yëgal saa su la neexee ak sa nimero yëgal. |  |
| `privacy[3]` | Les messages ne sont publiés qu'après une relecture manuelle, un par un. | Bataaxal yi, nit dafay jàng benn-benn balaa ñu koy siiwal. |  |
| `footer` | Projet indépendant de sensibilisation, sans lien avec un opérateur, une banque ou la police. Pour porter plainte, adressez-vous à la Division spéciale de cybersécurité de la Police nationale ou au commissariat le plus proche. | Liggéey bu bopp la ngir xamle, amul benn lëkkaloo ak opérateur, banque walla polis. Ngir tëral plainte, demal ca Division spéciale de cybersécurité bu Police nationale walla commissariat bi gën a jege. |  |
| `navLabel` | Pages du site | Xëtu sit bi |  |
| `navSignaler` | Signaler | Yëgal |  |
| `navApprendre` | S'entraîner | Tàggatu |  |
| `navOuSignaler` | Où signaler | Fan lañuy yëgale |  |
| `apTitle` | S'entraîner | Tàggatu |  |
| `apLead` | Douze situations vécues au Sénégal. Pour chacune, choisissez le bon réflexe. Rien n'est envoyé : tout se passe sur votre téléphone. | Fukk ak ñaar yu xew ci Senegaal. Ci kenn ku nekk, tànnal li war a def. Dara du dem : lépp ci sa telefon lay xew. |  |
| `apStart` | Commencer | Tàmbali |  |
| `apProgress` | Situation {n} sur {total} | Xew {n} ci {total} |  |
| `apGood` | Bon réflexe | Li war a def la |  |
| `apBad` | Pas cette fois | Du yii |  |
| `apMethod` | Méthode | Pexe |  |
| `apNext` | Situation suivante | Ba ci topp |  |
| `apEnd` | Voir mon résultat | Seet sama njureef |  |
| `apScoreTitle` | Votre résultat | Sa njureef |  |
| `apScore` | {n} bons réflexes sur {total} | {n} ci {total} yu jub |  |
| `apGrade[0]` | Continuez à vous entraîner : relisez les explications, puis recommencez. | Wéyal tàggatu : jàngaatal leeral yi, te tàmbaliwaat. |  |
| `apGrade[1]` | Bonne base : quelques pièges vous échappent encore. | Am nga lu baax : yenn fir yi des nañu la. |  |
| `apGrade[2]` | Excellent : vous reconnaissez les arnaques les plus courantes. | Baax na lool : xam nga naxe yi gën a bari. |  |
| `apRestart` | Recommencer | Tàmbaliwaat |  |
| `apReport` | Vous avez reçu un message de ce genre ? Signalez-le | Am nga bataaxal bu ni mel ? Yëgal ko |  |
| `osTitle` | Où signaler | Fan lañuy yëgale |  |
| `osLead` | Vous avez été visé par une arnaque, ou vous avez déjà envoyé de l'argent ou un code ? Agissez vite, dans cet ordre. | Dañu la jéem a nax, walla yónne nga xaalis walla ab code ? Gaawal, topp lii. |  |
| `osNowTitle` | Dans l'heure qui suit | Ci waxtu wi ci topp |  |
| `osNow[0]` | Ne répondez plus et ne rappelez pas le numéro : l'escroc cherche à vous garder en ligne. | Bul tontu te bul woowaat nimero bi : naxkat bi dafa bëgg nga des ci telefon bi. |  |
| `osNow[1]` | Contactez le service client de votre opérateur ou de votre banque depuis l'application officielle ou le numéro inscrit sur votre carte, pour bloquer la transaction ou votre compte. | Woowal service client bu sa opérateur walla sa banque ci application bu wóor bi walla nimero bi ci sa kart, ngir taxawal transaction bi walla sa compte. |  |
| `osNow[2]` | Si vous avez donné un code ou un mot de passe, changez-le tout de suite et demandez l'annulation des opérations en cours. | Su nga joxee ab code walla mot de passe, soppi ko léegi te ñaan ñu neenal li ñuy def. |  |
| `osNow[3]` | Gardez les preuves : captures d'écran du message, du numéro, de la date et du montant. Ne supprimez rien. | Denc firnde yi : nataal bataaxal bi, nimero bi, bés bi ak xaalis bi. Bul far dara. |  |
| `osReportTitle` | Signaler et porter plainte | Yëgal te tëral plainte |  |
| `osPlatform` | Plateforme de signalement en ligne de la Police nationale | Plateforme yëgale ci internet bu Police nationale |  |
| `osPlatformNote` | Elle permet un pré-signalement en ligne. Ce n'est pas un dépôt de plainte officiel. | Mën nga fa def ab pré-signalement. Du plainte bu wóor. |  |
| `osComplaint` | Pour porter plainte : la Division spéciale de cybersécurité de la Police nationale, ou le commissariat le plus proche, avec vos preuves. | Ngir tëral plainte : Division spéciale de cybersécurité bu Police nationale, walla commissariat bi gën a jege, ak sa firnde yi. |  |
| `osHereTitle` | Aider à protéger les autres | Dimbali ñeneen ñi |  |
| `osHere` | Partagez le message, masqué, sur ce site : il servira à reconnaître les prochaines arnaques. Cela ne remplace pas une plainte. | Yónne bataaxal bi ci sit bii, ñu nëbb ko : dina dimbali ngir xam naxe yi di ñëw. Du wuutu plainte. |  |
| `osHereCta` | Signaler le message ici | Yëgal bataaxal bi fii |  |
| `osWarn` | Aucun service client, aucune banque et aucun agent ne vous demandera jamais votre code secret. | Benn service client, benn banque, benn agent du la mës a laaj sa code bu kumpa. |  |
| `osSources` | Sources : | Fi lañu ko jële : |  |
| `theme` | Changer de thème | Soppi melokaan |  |
| `situation.code-annulation.methode` | Faux code d'annulation | Code d'annulation bu dul dëgg |  |
| `situation.code-annulation.scene` | Un SMS annonce un dépôt d'argent sur votre compte. Juste après, quelqu'un appelle : il dit s'être trompé de numéro et vous demande de taper un « code d'annulation » pour récupérer sa somme. | Ab SMS wax na ne dugg na xaalis ci sa compte. Ci kanam, kenn woo la : mu ne dafa juum nimero, te mu ñaan nga bind ab « code d'annulation » ngir mu jot xaalisam. |  |
| `situation.code-annulation.choix[0]` | Taper le code pour lui rendre service | Bind code bi ngir dimbali ko |  |
| `situation.code-annulation.choix[1]` | Vérifier mon solde dans l'application officielle, sans taper aucun code | Seet sama solde ci application bu wóor bi, te duma bind benn code |  |
| `situation.code-annulation.choix[2]` | Lui renvoyer la somme par un autre moyen | Yónne ko xaalis bi ci beneen yoon |  |
| `situation.code-annulation.pourquoi` | Le « code d'annulation » est en réalité un code de retrait ou de transfert : en le tapant, vous videz votre propre compte. Un dépôt se vérifie dans l'application, et une vraie erreur se règle avec le service client, jamais par un code donné au téléphone. | « Code d'annulation » bi, code retrait walla transfert la : boo ko bindee, sa compte nga koy dindi. Dépôt dañu koy seet ci application bi, te njuumte bu dëgg, service client moo koy defar, du ab code boo joxe ci telefon. |  |
| `situation.faux-agent.methode` | Faux service client | Service client bu dul dëgg |  |
| `situation.faux-agent.scene` | Un appelant se présente comme agent du service client de votre mobile money. Il parle d'une faille de sécurité sur votre compte et vous demande votre code secret pour « le protéger ». | Kenn woo la, ne agent service client bu sa mobile money la. Mu wax ci ab njàqare ci sa compte, te mu laaj sa code bu kumpa ngir « aar ko ». |  |
| `situation.faux-agent.choix[0]` | Raccrocher, puis appeler moi-même le service client depuis l'application officielle | Dagg woote bi, te ma woo service client bi ci application bu wóor bi |  |
| `situation.faux-agent.choix[1]` | Lui donner le code, puisqu'il veut protéger mon compte | Jox ko code bi, ndax dafa bëgg aar sama compte |  |
| `situation.faux-agent.choix[2]` | Lui donner seulement la moitié du code | Jox ko genn-wàll bu code bi rekk |  |
| `situation.faux-agent.pourquoi` | Aucun service client ne demande jamais votre code secret. L'escroc se fait passer pour une autorité de confiance pour vous faire baisser la garde. Rappelez vous-même le numéro affiché dans l'application. | Benn service client du la mës a laaj sa code bu kumpa. Naxkat bi dafay def ni dafa am sañ-sañ ngir nga woyofal sa bopp. Yaw ci sa bopp woowal nimero bi nekk ci application bi. |  |
| `situation.faux-gain.methode` | Faux gain | Xéewal bu dul dëgg |  |
| `situation.faux-gain.scene` | Un SMS vous félicite : vous auriez gagné à une tombola d'un opérateur. Pour recevoir le lot, il faut payer des « frais de dossier » ou ouvrir un lien. | Ab SMS ne la ndokkale : nga ne dañu la jox ci ab tombola bu opérateur. Ngir jot sa xéewal, nga fey « frais de dossier » walla ubbi ab lien. |  |
| `situation.faux-gain.choix[0]` | Payer les frais, ils sont petits par rapport au lot | Fey frais yi, ndax tuuti nañu |  |
| `situation.faux-gain.choix[1]` | Ouvrir le lien juste pour voir | Ubbi lien bi ngir seet rekk |  |
| `situation.faux-gain.choix[2]` | Ignorer, vérifier sur les canaux officiels de l'opérateur, puis signaler | Bàyyi ko, seet ci yoonu opérateur bi yu wóor, te yëgal ko |  |
| `situation.faux-gain.pourquoi` | On ne gagne pas à un jeu auquel on n'a pas participé, et un vrai gain ne coûte jamais de frais. Les frais sont l'arnaque, et le lien sert à voler vos identifiants. | Kenn du jot ci po bu mu bokkul, te xéewal bu dëgg du laaj frais. Frais yi ñooy naxe bi, te lien bi ngir sàcc sa xibaar. |  |
| `situation.trop-percu.methode` | Faux « envoi par erreur » | « Yónne naa la ci njuumte » bu dul dëgg |  |
| `situation.trop-percu.scene` | Vous recevez un petit transfert d'un inconnu. Peu après, il vous écrit qu'il a envoyé beaucoup plus par erreur et vous demande de lui renvoyer la différence. | Am nga xaalis bu tuuti bu kenn ku nga xamul yónne. Ci kanam, mu bind la ne dafa yónne lu ëpp ci njuumte, te mu ñaan nga delloo ko li ëpp. |  |
| `situation.trop-percu.choix[0]` | Vérifier le montant réel dans l'historique de l'application et laisser le service client gérer | Seet xaalis bi dugg ci historique bu application bi, te bàyyi service client bi mu saytu |  |
| `situation.trop-percu.choix[1]` | Lui renvoyer la différence qu'il annonce | Delloo ko li mu wax ne ëpp na |  |
| `situation.trop-percu.choix[2]` | Renvoyer tout de suite la somme au numéro qu'il vous donne | Yónne léegi xaalis bi ci nimero bi mu la jox |  |
| `situation.trop-percu.pourquoi` | La « différence » n'existe pas : seul le petit montant est arrivé. Une vraie erreur se corrige par le service client, qui annule la transaction, pas par vous. | « Li ëpp » amul : xaalis bu tuuti bi rekk moo dugg. Njuumte bu dëgg, service client moo koy neenal, du yaw. |  |
| `situation.faux-fournisseur.methode` | Faux fournisseur | Fournisseur bu dul dëgg |  |
| `situation.faux-fournisseur.scene` | Votre commerce reçoit un message d'un numéro inconnu qui se présente comme votre fournisseur habituel. Il a « changé de numéro » et réclame un paiement urgent pour une commande. | Sa bitig jot na bataaxal ci nimero bu nga xamul, ku ne sa fournisseur bu yàgg la. Mu ne « soppi na nimero » te mu laaj nga fey léegi ab commande. |  |
| `situation.faux-fournisseur.choix[0]` | Payer au nouveau numéro pour ne pas perdre la commande | Fey ci nimero bu bees bi ngir commande bi bañ a réer |  |
| `situation.faux-fournisseur.choix[1]` | Demander une photo de la facture, puis payer | Laaj nataalu facture bi, te fey |  |
| `situation.faux-fournisseur.choix[2]` | Appeler le fournisseur sur son numéro habituel pour confirmer | Woo fournisseur bi ci nimero bi mu daan jëfandikoo ngir wóoral |  |
| `situation.faux-fournisseur.pourquoi` | L'escroc joue sur la confiance et sur l'urgence. Un changement de numéro se confirme toujours par l'ancien canal, que vous connaissez. Une photo de facture se fabrique en deux minutes. | Naxkat bi dafay jëfandikoo kóolute ak gaaw. Soppi nimero, dañu koy wóoral ci yoon wu yàgg wi nga xam. Nataalu facture, ci ñaari simili lañu koy defar. |  |
| `situation.qr-code.methode` | QR code détourné | QR code bu ñu soppi |  |
| `situation.qr-code.scene` | Dans une boutique, un autocollant QR code de paiement a été collé par-dessus celui du marchand. Une fois scanné, l'écran affiche un autre nom de bénéficiaire. | Ci ab bitig, ab QR code bu fey lañu taq ci kaw bu jaaykat bi. Boo ko scannee, ekraan bi dafay won beneen turu ki koy jot. |  |
| `situation.qr-code.choix[0]` | Valider quand même, c'est le QR code de la boutique | Wóoral rekk, QR code bu bitig bi la |  |
| `situation.qr-code.choix[1]` | Vérifier le nom avec le marchand, ou saisir moi-même son code marchand | Seet tur wi ak jaaykat bi, walla bind sama loxo code marchand bi |  |
| `situation.qr-code.choix[2]` | Scanner une deuxième fois | Scanneewaat ko |  |
| `situation.qr-code.pourquoi` | Un QR code cache sa destination. Le nom du bénéficiaire affiché avant de valider est le seul vrai indice : s'il ne correspond pas, on ne paie pas. | QR code dafay nëbb fu mu jëm. Turu ki koy jot bi feeñ balaa ngay wóoral, mooy firnde bi : su dëppoowul, doo fey. |  |
| `situation.faux-emploi.methode` | Fausse offre d'emploi | Liggéey bu dul dëgg |  |
| `situation.faux-emploi.scene` | Une annonce sur les réseaux sociaux promet un emploi bien payé, sans entretien. Pour « réserver la place », on vous demande des frais de formation et une copie de votre pièce d'identité. | Ab yéenekaay ci réseaux sociaux dafa digle ab liggéey bu fey bu baax, te amul entretien. Ngir « jël sa palaas », dañu la laaj frais formation ak ab copie bu sa kàrt identité. |  |
| `situation.faux-emploi.choix[0]` | Vérifier que l'entreprise existe par ses canaux officiels, et ne jamais payer pour être embauché | Seet ndax entreprise bi am na ci yoon yu wóor, te mukk doo fey ngir ñu jël la |  |
| `situation.faux-emploi.choix[1]` | Payer vite pour ne pas perdre l'occasion | Fey léegi ngir bañ a ñàkk bii yoon |  |
| `situation.faux-emploi.choix[2]` | Envoyer d'abord la pièce d'identité, payer ensuite | Yónne kàrt identité bi jëkk, fey ci kanam |  |
| `situation.faux-emploi.pourquoi` | Un employeur sérieux ne fait jamais payer un candidat. Les frais sont l'arnaque, et la pièce d'identité peut servir à usurper votre identité. | Kilifa liggéey bu dëgg du fey-loo ki di sàkku liggéey. Frais yi ñooy naxe bi, te sa kàrt identité mën nañu ko jëfandikoo ngir def ni yaw lañu. |  |
| `situation.faux-colis.methode` | Faux colis | Colis bu dul dëgg |  |
| `situation.faux-colis.scene` | Un SMS d'un prétendu livreur indique qu'un colis est bloqué. Il faut payer des frais de livraison par un lien, sous 24 heures. | Ab SMS bu kenn ku ne livreur la wax na ne ab colis dafa taxaw. War nga fey frais livraison ci ab lien, ci 24 waxtu. |  |
| `situation.faux-colis.choix[0]` | Payer par le lien, ce ne sont que des frais | Fey ci lien bi, frais rekk la |  |
| `situation.faux-colis.choix[1]` | Répondre au SMS pour demander des détails | Tontu SMS bi ngir laaj leeral |  |
| `situation.faux-colis.choix[2]` | Vérifier le suivi en tapant moi-même l'adresse officielle du transporteur, ou ignorer si je n'attends rien | Seet suivi bi, ma bind sama loxo adress bu wóor bu transporteur bi, walla bàyyi ko su ma xaarul dara |  |
| `situation.faux-colis.pourquoi` | L'urgence et le lien sont les deux signaux. Le lien mène à une page qui vole vos coordonnées. Le vrai suivi se consulte en tapant soi-même l'adresse du transporteur. | Gaaw ak lien ñooy ñaari firnde yi. Lien bi dafay yóbbu ci xët wu sàcc sa xibaar. Suivi bu dëgg, yaw ci sa bopp nga koy bind adress bu transporteur bi. |  |
| `situation.faux-placement.methode` | Faux placement | Placement bu dul dëgg |  |
| `situation.faux-placement.scene` | Un contact vous propose de doubler votre argent en un mois grâce à un « placement » ou une tontine en ligne, captures d'écran de gains d'autres membres à l'appui. | Kenn ci say xarit dafa la digle nga ful sa xaalis ñaari yoon ci benn weer ci ab « placement » walla tontine ci internet, te mu won la nataal yu ñeneen ñu jot. |  |
| `situation.faux-placement.choix[0]` | Placer une petite somme pour tester | Def xaalis bu tuuti ngir jéem |  |
| `situation.faux-placement.choix[1]` | Refuser : un rendement garanti aussi élevé n'existe pas, et demander conseil à ma banque | Bañ : ful bu mel noonu amul, te laaj sama banque |  |
| `situation.faux-placement.choix[2]` | Inviter des amis pour partager le risque | Woo ay xarit ngir séddoo njàqare bi |  |
| `situation.faux-placement.pourquoi` | Un gain garanti et très élevé est le signe d'une pyramide : les premiers sont payés avec l'argent des suivants, puis tout s'effondre. Les captures de gains se fabriquent facilement. | Ful bu wóor te bari lool, firndeu pyramide la : ñi jëkk, xaalisu ñi topp lañu leen di fey, te lépp dafay daanu. Nataalu ful yi, dañu leen di defar ci yombal. |  |
| `situation.faux-proche.methode` | Faux proche | Mbokk bu dul dëgg |  |
| `situation.faux-proche.scene` | Un proche vous écrit sur WhatsApp depuis un nouveau numéro : il a perdu son téléphone et a besoin d'argent tout de suite. | Ab mbokk bind na la ci WhatsApp ci nimero bu bees : ne réer na telefonam te soxla na xaalis léegi. |  |
| `situation.faux-proche.choix[0]` | Envoyer l'argent, il a l'air pressé | Yónne xaalis bi, dafa mel ni dafa gaaw |  |
| `situation.faux-proche.choix[1]` | Envoyer la moitié pour l'aider un peu | Yónne genn-wàll ngir dimbali ko tuuti |  |
| `situation.faux-proche.choix[2]` | L'appeler sur son ancien numéro, ou lui poser une question que lui seul connaît | Woo ko ci nimero bu yàgg bi, walla laaj ko lu mu rekk xam |  |
| `situation.faux-proche.pourquoi` | Usurper un proche marche bien parce qu'on veut aider vite. Vérifiez toujours par un autre canal avant d'envoyer quoi que ce soit. | Def ni ab mbokk la dafay yomb ndax danuy bëgg dimbali ci gaaw. Seetal ci beneen yoon balaa ngay yónne dara. |  |
| `situation.code-verification.methode` | Vol de code de vérification | Sàcc code vérification |  |
| `situation.code-verification.scene` | Vous recevez par SMS un code de vérification que vous n'avez pas demandé. Un appelant dit s'être trompé et vous demande de lui lire ce code. | Am nga ci SMS ab code vérification bu nga laajul. Kenn woo la ne dafa juum, te mu ñaan nga jàngal ko code bi. |  |
| `situation.code-verification.choix[0]` | Ne jamais le partager : changer mon mot de passe et prévenir mon opérateur | Mukk duma ko wax kenn : soppi sama mot de passe te yëgal sama opérateur |  |
| `situation.code-verification.choix[1]` | Lui lire le code, il s'est trompé | Jàngal ko code bi, dafa juum |  |
| `situation.code-verification.choix[2]` | Lui donner seulement les premiers chiffres | Jox ko ay chiffre yu jëkk rekk |  |
| `situation.code-verification.pourquoi` | Ce code sert à prendre le contrôle d'un compte (WhatsApp, mobile money) ou de votre ligne. Le partager, c'est donner la clé. Un code reçu sans l'avoir demandé est une alerte. | Code bii, ngir jël sa compte (WhatsApp, mobile money) walla sa ligne la. Boo ko waxee, caabi ji nga joxe. Code boo jot te laajoo ko, ab artu la. |  |
| `situation.faux-lien-maj.methode` | Faux lien de mise à jour | Lien mise à jour bu dul dëgg |  |
| `situation.faux-lien-maj.scene` | Un message vous invite à « mettre à jour » votre compte mobile money sur une page web, sinon il sera bloqué aujourd'hui. | Ab bataaxal ne nga « mise à jour » sa compte mobile money ci ab xët web, lu ko moy dañu koy tëj tey. |  |
| `situation.faux-lien-maj.choix[0]` | Faire la mise à jour par le lien avant le blocage | Def mise à jour bi ci lien bi balaa ñu koy tëj |  |
| `situation.faux-lien-maj.choix[1]` | Ouvrir directement l'application officielle : aucune mise à jour ne se fait par un lien reçu | Ubbi application bu wóor bi : benn mise à jour du jaar ci lien bu ñu la yónne |  |
| `situation.faux-lien-maj.choix[2]` | Appeler le numéro indiqué dans le message | Woo nimero bi nekk ci bataaxal bi |  |
| `situation.faux-lien-maj.pourquoi` | Les mises à jour se font dans l'application officielle, jamais par un lien reçu. La menace de blocage sert à vous presser, et le numéro du message appartient lui aussi à l'escroc. | Mise à jour, ci application bu wóor bi lañu koy def, du ci lien bu ñu la yónne. Tëj bi ñu la tiitaloo, ngir nga gaaw la, te nimero bi ci bataaxal bi, bu naxkat bi la itam. |  |
