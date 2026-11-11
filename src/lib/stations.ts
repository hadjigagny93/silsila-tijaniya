// Les cent stations d'al-Harawī (m. 1089), Manāzil al-sāʾirīn : dix sections de dix stations.
// Les explications sont de courts résumés écrits pour l'app ; chacun peut les reprendre à sa façon.

export type StationKind = "station" | "state" | "horizon";

export type Section = {
  key: string;
  arabic: string;
  name: string;
  // Les états (aḥwāl) se vivent et passent : on note des moments. Les fins sont un horizon, sans évaluation.
  kind: StationKind;
  stations: { id: string; arabic: string; translit: string; name: string; explanation: string }[];
};

export const SECTIONS: Section[] = [
  {
    key: "bidayat",
    arabic: "البدايات",
    name: "Les débuts",
    kind: "station",
    stations: [
      { id: "yaqaza", arabic: "يقظة", translit: "yaqẓa", name: "L'éveil", explanation: "Le cœur sort de l'insouciance : on prend conscience de Dieu, de ses bienfaits et de sa propre négligence. C'est le premier pas, sans lequel aucun autre n'est possible." },
      { id: "tawba", arabic: "توبة", translit: "tawba", name: "Le repentir", explanation: "Revenir vers Dieu en regrettant ses fautes, en les quittant et en décidant de ne plus y retourner. Le repentir se renouvelle à chaque étape du chemin." },
      { id: "muhasaba", arabic: "محاسبة", translit: "muḥāsaba", name: "L'examen de soi", explanation: "Faire chaque jour le compte de ses actes et de ses intentions, avant d'en rendre compte devant Dieu. On y pèse ce qui a été donné et ce qui a été négligé." },
      { id: "inaba", arabic: "إنابة", translit: "ināba", name: "Le retour à Dieu", explanation: "Après le repentir, se tourner tout entier vers Dieu : en actes, en pensées et en désirs. On revient à Lui en tout ce qui arrive." },
      { id: "tafakkur", arabic: "تفكر", translit: "tafakkur", name: "La méditation", explanation: "Réfléchir sur les signes de Dieu, dans la création, dans le Coran et en soi-même. La méditation éclaire le cœur et nourrit la crainte et l'amour." },
      { id: "tadhakkur", arabic: "تذكر", translit: "tadhakkur", name: "Le ressouvenir", explanation: "Se rappeler ce qu'on a compris pour en tirer profit. Là où la méditation cherche, le ressouvenir garde et met en pratique." },
      { id: "itisam", arabic: "اعتصام", translit: "iʿtiṣām", name: "L'attachement ferme", explanation: "Se tenir fermement à la corde de Dieu : à Sa loi, à Son Messager et à Lui seul. On s'y accroche pour ne pas être emporté." },
      { id: "firar", arabic: "فرار", translit: "firār", name: "La fuite vers Dieu", explanation: "Fuir ce qui éloigne de Dieu pour se réfugier en Lui : fuir l'ignorance vers la science, la paresse vers l'effort, le monde vers son Seigneur." },
      { id: "riyada", arabic: "رياضة", translit: "riyāḍa", name: "La discipline", explanation: "Exercer et assouplir l'âme par l'effort : moins manger, moins dormir, moins parler. Elle prépare l'âme à recevoir la lumière." },
      { id: "sama", arabic: "سماع", translit: "samāʿ", name: "L'écoute", explanation: "Écouter la parole de Dieu et les rappels avec le cœur, pour en être touché et transformé. Ce n'est pas l'oreille seule qui entend." },
    ],
  },
  {
    key: "abwab",
    arabic: "الأبواب",
    name: "Les portes",
    kind: "station",
    stations: [
      { id: "huzn", arabic: "حزن", translit: "ḥuzn", name: "La tristesse", explanation: "La peine du cœur pour le temps perdu et les manquements envers Dieu. Elle attendrit le cœur et le pousse à se reprendre." },
      { id: "khawf", arabic: "خوف", translit: "khawf", name: "La crainte", explanation: "Craindre Dieu, Sa justice et l'éloignement de Lui. La crainte retient de la désobéissance et garde sur le droit chemin." },
      { id: "ishfaq", arabic: "إشفاق", translit: "ishfāq", name: "L'appréhension", explanation: "Une crainte mêlée de tendresse : on redoute de perdre ce qu'on a reçu et de mal faire, pour soi et pour les autres." },
      { id: "khushu", arabic: "خشوع", translit: "khushūʿ", name: "Le recueillement", explanation: "L'humble présence du cœur devant Dieu, qui se voit jusque dans le corps, surtout dans la prière." },
      { id: "ikhbat", arabic: "إخبات", translit: "ikhbāt", name: "L'humilité soumise", explanation: "Le cœur s'apaise et s'abaisse devant Dieu, sans résistance ni révolte. On reçoit Ses décrets avec douceur." },
      { id: "zuhd", arabic: "زهد", translit: "zuhd", name: "Le renoncement", explanation: "Détacher son cœur de ce qui passe. On peut posséder le monde, mais il ne doit pas posséder le cœur." },
      { id: "wara", arabic: "ورع", translit: "waraʿ", name: "Le scrupule", explanation: "S'abstenir de ce qui est douteux par crainte de tomber dans l'interdit. On veille sur ce qu'on mange, dit et fait." },
      { id: "tabattul", arabic: "تبتل", translit: "tabattul", name: "La consécration", explanation: "Se consacrer à Dieu seul en se coupant intérieurement de tout ce qui distrait de Lui." },
      { id: "raja", arabic: "رجاء", translit: "rajāʾ", name: "L'espérance", explanation: "Espérer la miséricorde de Dieu, Son pardon et Sa rencontre. L'espérance donne la force d'avancer, et la crainte la retient de s'égarer." },
      { id: "raghba", arabic: "رغبة", translit: "raghba", name: "Le désir de Dieu", explanation: "Un élan du cœur vers Dieu et ce qui est auprès de Lui, plus fort que l'espérance, qui met l'âme en mouvement." },
    ],
  },
  {
    key: "muamalat",
    arabic: "المعاملات",
    name: "Les conduites",
    kind: "station",
    stations: [
      { id: "riaya", arabic: "رعاية", translit: "riʿāya", name: "La sauvegarde attentive", explanation: "Prendre soin de ses actes, de ses états et de ses instants, comme on garde un dépôt précieux, pour qu'ils ne se gâtent pas." },
      { id: "muraqaba", arabic: "مراقبة", translit: "murāqaba", name: "La vigilance", explanation: "Avoir sans cesse conscience que Dieu voit et sait tout. Cette présence règle les pensées autant que les actes." },
      { id: "hurma", arabic: "حرمة", translit: "ḥurma", name: "Le respect du sacré", explanation: "Respecter les limites de Dieu, Ses commandements et Ses interdits, et tout ce qui Lui est cher." },
      { id: "ikhlas", arabic: "إخلاص", translit: "ikhlāṣ", name: "La sincérité", explanation: "Purifier l'intention pour n'agir que pour Dieu, sans chercher le regard ni l'éloge des gens." },
      { id: "tahdhib", arabic: "تهذيب", translit: "tahdhīb", name: "L'affinement", explanation: "Polir et éduquer son âme et ses actes, en ôtant peu à peu ce qui les ternit." },
      { id: "istiqama", arabic: "استقامة", translit: "istiqāma", name: "La droiture", explanation: "Se tenir droit sur le chemin, avec constance, sans dévier ni à droite ni à gauche. Les maîtres la placent au-dessus des prodiges." },
      { id: "tawakkul", arabic: "توكل", translit: "tawakkul", name: "La remise confiante", explanation: "S'en remettre à Dieu pour toute chose, tout en agissant, avec un cœur qui ne compte que sur Lui." },
      { id: "tafwid", arabic: "تفويض", translit: "tafwīḍ", name: "L'abandon", explanation: "Confier son affaire entière à Dieu, avant même qu'elle n'arrive, sans Lui opposer sa volonté propre." },
      { id: "thiqa", arabic: "ثقة", translit: "thiqa", name: "La confiance", explanation: "Être sûr de Dieu, de Sa promesse et de Son choix : ce qu'Il décide est meilleur que ce qu'on aurait choisi." },
      { id: "taslim", arabic: "تسليم", translit: "taslīm", name: "La soumission totale", explanation: "Se rendre à Dieu sans objection intérieure, dans ce qui plaît comme dans ce qui déplaît." },
    ],
  },
  {
    key: "akhlaq",
    arabic: "الأخلاق",
    name: "Les vertus",
    kind: "station",
    stations: [
      { id: "sabr", arabic: "صبر", translit: "ṣabr", name: "La patience", explanation: "Retenir l'âme de la plainte et de l'impatience : patience dans l'obéissance, face aux tentations et dans l'épreuve." },
      { id: "rida", arabic: "رضا", translit: "riḍā", name: "Le contentement", explanation: "Être satisfait de Dieu et de ce qu'Il décrète, au point que l'épreuve ne trouble plus la paix du cœur." },
      { id: "shukr", arabic: "شكر", translit: "shukr", name: "La gratitude", explanation: "Reconnaître les bienfaits comme venant de Dieu, L'en louer et les employer dans ce qu'Il aime." },
      { id: "haya", arabic: "حياء", translit: "ḥayāʾ", name: "La pudeur", explanation: "Une retenue du cœur devant Dieu qui voit tout. Elle empêche de faire devant Lui ce qu'on aurait honte de faire devant un proche." },
      { id: "sidq", arabic: "صدق", translit: "ṣidq", name: "La véracité", explanation: "Être vrai en paroles, en intentions et en actes : que le dedans corresponde au dehors." },
      { id: "ithar", arabic: "إيثار", translit: "īthār", name: "L'altruisme", explanation: "Préférer autrui à soi-même dans ce qu'on aime, par générosité et pour l'amour de Dieu." },
      { id: "khuluq", arabic: "خلق", translit: "khuluq", name: "Le bon caractère", explanation: "La douceur, la bienveillance et la patience envers les gens, à l'image du Prophète ﷺ." },
      { id: "tawadu", arabic: "تواضع", translit: "tawāḍuʿ", name: "L'humilité", explanation: "Ne pas se voir au-dessus des autres, accepter la vérité d'où qu'elle vienne, et s'abaisser devant Dieu." },
      { id: "futuwwa", arabic: "فتوة", translit: "futuwwa", name: "La noblesse chevaleresque", explanation: "Servir les autres sans rien attendre, pardonner, ne pas se plaindre et ne jamais se voir de mérite." },
      { id: "inbisat", arabic: "انبساط", translit: "inbisāṭ", name: "L'aisance familière", explanation: "Une confiance détendue envers Dieu, née de l'amour, qui se garde toujours de l'irrespect." },
    ],
  },
  {
    key: "usul",
    arabic: "الأصول",
    name: "Les fondements",
    kind: "station",
    stations: [
      { id: "qasd", arabic: "قصد", translit: "qaṣd", name: "L'intention", explanation: "Se donner Dieu pour seul but, et orienter vers Lui chaque pas du chemin." },
      { id: "azm", arabic: "عزم", translit: "ʿazm", name: "La résolution", explanation: "Une décision ferme de marcher sans retour, qui ne se laisse pas briser par les obstacles." },
      { id: "irada", arabic: "إرادة", translit: "irāda", name: "La volonté", explanation: "Ne vouloir que Dieu. C'est d'elle que le disciple tire son nom de murīd, « celui qui veut »." },
      { id: "adab", arabic: "أدب", translit: "adab", name: "La bonne tenue", explanation: "La juste conduite envers Dieu, Son Messager, le maître et les gens. Les maîtres disent que toute la voie est adab." },
      { id: "yaqin", arabic: "يقين", translit: "yaqīn", name: "La certitude", explanation: "Une connaissance ferme qui ne laisse plus de place au doute, et qui fait voir les choses comme elles sont." },
      { id: "uns", arabic: "أنس", translit: "uns", name: "L'intimité", explanation: "La joie et la paix de la proximité de Dieu, qui rendent la solitude douce et le monde moins nécessaire." },
      { id: "dhikr", arabic: "ذكر", translit: "dhikr", name: "Le rappel de Dieu", explanation: "Se souvenir de Dieu par la langue et par le cœur, jusqu'à ne plus jamais L'oublier. C'est la nourriture du chemin." },
      { id: "faqr", arabic: "فقر", translit: "faqr", name: "La pauvreté spirituelle", explanation: "Se savoir entièrement dépendant de Dieu, sans rien posséder en propre, ni biens, ni actes, ni états." },
      { id: "ghina", arabic: "غنى", translit: "ghinā", name: "La richesse en Dieu", explanation: "Être comblé par Dieu au point de n'avoir plus besoin de rien d'autre que Lui." },
      { id: "maqam-murad", arabic: "مقام المراد", translit: "maqām al-murād", name: "La station de l'élu", explanation: "Celui que Dieu attire à Lui : il ne marche plus seulement, il est porté. C'est un don et non le fruit de l'effort." },
    ],
  },
  {
    key: "awdiya",
    arabic: "الأودية",
    name: "Les vallées",
    kind: "station",
    stations: [
      { id: "ihsan", arabic: "إحسان", translit: "iḥsān", name: "L'excellence", explanation: "Adorer Dieu comme si on Le voyait ; et si on ne Le voit pas, Lui nous voit." },
      { id: "ilm", arabic: "علم", translit: "ʿilm", name: "La science", explanation: "La connaissance qui vient de la révélation et de l'expérience du cœur, et qui conduit à agir." },
      { id: "hikma", arabic: "حكمة", translit: "ḥikma", name: "La sagesse", explanation: "Mettre chaque chose à sa juste place, au juste moment, selon la volonté de Dieu." },
      { id: "basira", arabic: "بصيرة", translit: "baṣīra", name: "La clairvoyance", explanation: "La vue du cœur, qui perçoit la vérité au-delà des apparences." },
      { id: "firasa", arabic: "فراسة", translit: "firāsa", name: "L'intuition", explanation: "Une perception juste des êtres et des choses, née de la lumière que Dieu met dans le cœur du croyant." },
      { id: "tazim", arabic: "تعظيم", translit: "taʿẓīm", name: "La vénération", explanation: "Reconnaître la grandeur de Dieu et honorer ce qu'Il a rendu sacré." },
      { id: "ilham", arabic: "إلهام", translit: "ilhām", name: "L'inspiration", explanation: "Ce que Dieu dépose dans le cœur sans étude ni effort, toujours à peser à la lumière de la loi." },
      { id: "sakina", arabic: "سكينة", translit: "sakīna", name: "La paix d'en haut", explanation: "Une paix que Dieu fait descendre dans le cœur, qui le rassure au milieu des épreuves." },
      { id: "tumanina", arabic: "طمأنينة", translit: "ṭumaʾnīna", name: "La quiétude", explanation: "La tranquillité durable du cœur apaisé par Dieu, qui ne s'agite plus." },
      { id: "himma", arabic: "همة", translit: "himma", name: "L'aspiration élevée", explanation: "Une force du cœur tournée vers le plus haut, qui ne se contente de rien d'autre que de Dieu." },
    ],
  },
  {
    key: "ahwal",
    arabic: "الأحوال",
    name: "Les états",
    kind: "state",
    stations: [
      { id: "mahabba", arabic: "محبة", translit: "maḥabba", name: "L'amour", explanation: "L'inclination du cœur vers Dieu, qui fait aimer ce qu'Il aime et préférer Sa volonté à la sienne." },
      { id: "ghayra", arabic: "غيرة", translit: "ghayra", name: "La jalousie sacrée", explanation: "Ne pas supporter que le cœur se tourne vers autre que Dieu, ni que l'on manque à Ses droits." },
      { id: "shawq", arabic: "شوق", translit: "shawq", name: "Le désir ardent", explanation: "L'élan de l'âme vers la rencontre de Celui qu'elle aime." },
      { id: "qalaq", arabic: "قلق", translit: "qalaq", name: "L'inquiétude amoureuse", explanation: "Un désir si fort qu'il ôte le repos : l'âme ne trouve plus de place ici-bas." },
      { id: "atash", arabic: "عطش", translit: "ʿaṭash", name: "La soif", explanation: "Une soif de Dieu que rien n'étanche : plus on reçoit, plus on désire." },
      { id: "wajd", arabic: "وجد", translit: "wajd", name: "L'émoi", explanation: "Ce qui saisit le cœur à l'improviste, venu de Dieu : tristesse, joie ou crainte." },
      { id: "dahash", arabic: "دهش", translit: "dahash", name: "La stupeur", explanation: "L'étonnement qui laisse sans voix devant ce qui se dévoile, au-delà de toute attente." },
      { id: "hayman", arabic: "هيمان", translit: "haymān", name: "L'éperdu amour", explanation: "L'amant éperdu, qui perd ses repères dans l'amour de Dieu." },
      { id: "barq", arabic: "برق", translit: "barq", name: "L'éclair", explanation: "Une lumière qui jaillit dans le cœur et disparaît aussitôt, en invitant à aller plus loin." },
      { id: "dhawq", arabic: "ذوق", translit: "dhawq", name: "Le goût", explanation: "Goûter directement les réalités spirituelles, au-delà de ce qu'on en sait." },
    ],
  },
  {
    key: "wilayat",
    arabic: "الولايات",
    name: "Les saintetés",
    kind: "station",
    stations: [
      { id: "lahz", arabic: "لحظ", translit: "laḥẓ", name: "Le regard furtif", explanation: "Un regard du cœur vers ce que Dieu montre, bref mais transformant." },
      { id: "waqt", arabic: "وقت", translit: "waqt", name: "L'instant présent", explanation: "Être tout entier à ce que Dieu demande maintenant. Le soufi est « fils de l'instant »." },
      { id: "safa", arabic: "صفاء", translit: "ṣafāʾ", name: "La pureté", explanation: "Un cœur limpide, délivré des troubles, qui reflète la lumière sans la ternir." },
      { id: "surur", arabic: "سرور", translit: "surūr", name: "La joie", explanation: "Une joie en Dieu qui ne dépend plus des choses du monde." },
      { id: "sirr", arabic: "سر", translit: "sirr", name: "Le secret intime", explanation: "Ce qui reste entre le serviteur et son Seigneur, caché même aux yeux de l'âme." },
      { id: "nafas", arabic: "نفس", translit: "nafas", name: "Le souffle", explanation: "Chaque souffle vécu avec Dieu, sans qu'aucun soit perdu dans l'oubli." },
      { id: "ghurba", arabic: "غربة", translit: "ghurba", name: "L'exil", explanation: "Se sentir étranger en ce monde, parce que le cœur a trouvé sa patrie ailleurs." },
      { id: "gharaq", arabic: "غرق", translit: "gharaq", name: "L'immersion", explanation: "Être plongé dans la contemplation au point de ne plus percevoir le reste." },
      { id: "ghayba", arabic: "غيبة", translit: "ghayba", name: "L'absence", explanation: "Être absent à soi-même et aux créatures, présent à Dieu seul." },
      { id: "tamakkun", arabic: "تمكن", translit: "tamakkun", name: "La stabilité", explanation: "Être enraciné : les états ne nous emportent plus, on demeure stable en Dieu." },
    ],
  },
  {
    key: "haqaiq",
    arabic: "الحقائق",
    name: "Les réalités",
    kind: "station",
    stations: [
      { id: "mukashafa", arabic: "مكاشفة", translit: "mukāshafa", name: "Le dévoilement", explanation: "Les voiles se lèvent sur le cœur, qui perçoit ce qui était caché." },
      { id: "mushahada", arabic: "مشاهدة", translit: "mushāhada", name: "La contemplation", explanation: "Le cœur témoigne de la présence de Dieu en toute chose." },
      { id: "muayana", arabic: "معاينة", translit: "muʿāyana", name: "La vision directe", explanation: "Voir par la certitude, sans intermédiaire, ce qu'on ne connaissait que par la foi." },
      { id: "hayat", arabic: "حياة", translit: "ḥayāt", name: "La vie", explanation: "La vraie vie du cœur, vivifié par la connaissance et l'amour de Dieu." },
      { id: "qabd", arabic: "قبض", translit: "qabḍ", name: "La contraction", explanation: "Un resserrement du cœur voulu par Dieu, qui éduque et purifie." },
      { id: "bast", arabic: "بسط", translit: "basṭ", name: "La dilatation", explanation: "Un épanouissement du cœur, que Dieu donne et qui demande à être vécu avec adab." },
      { id: "sukr", arabic: "سكر", translit: "sukr", name: "L'ivresse", explanation: "L'emprise de l'amour et de la contemplation, qui fait perdre la mesure ordinaire." },
      { id: "sahw", arabic: "صحو", translit: "ṣaḥw", name: "La lucidité", explanation: "Le retour à la conscience après l'ivresse, plus élevé qu'elle car il réunit la présence et la loi." },
      { id: "ittisal", arabic: "اتصال", translit: "ittiṣāl", name: "L'union", explanation: "Ne plus être séparé de Dieu par aucun voile du cœur." },
      { id: "infisal", arabic: "انفصال", translit: "infiṣāl", name: "La séparation", explanation: "Être séparé de tout ce qui n'est pas Dieu." },
    ],
  },
  {
    key: "nihayat",
    arabic: "النهايات",
    name: "Les fins",
    kind: "horizon",
    stations: [
      { id: "marifa", arabic: "معرفة", translit: "maʿrifa", name: "La connaissance de Dieu", explanation: "Connaître Dieu par Lui-même, au-delà des raisonnements : la gnose." },
      { id: "fana", arabic: "فناء", translit: "fanāʾ", name: "L'extinction", explanation: "S'éteindre à soi-même, à ses attributs et à sa volonté propre, en Dieu." },
      { id: "baqa", arabic: "بقاء", translit: "baqāʾ", name: "La permanence", explanation: "Demeurer par Dieu après l'extinction, et revenir aux créatures pour les servir." },
      { id: "tahqiq", arabic: "تحقيق", translit: "taḥqīq", name: "La réalisation", explanation: "Que la vérité connue devienne réalité vécue en tout l'être." },
      { id: "talbis", arabic: "تلبيس", translit: "talbīs", name: "Le voilement", explanation: "Le saint se cache sous des dehors ordinaires, pour ne pas être remarqué." },
      { id: "wujud", arabic: "وجود", translit: "wujūd", name: "La découverte de l'Être", explanation: "Trouver Dieu : la réalité se révèle à celui qui s'est perdu en Lui." },
      { id: "tajrid", arabic: "تجريد", translit: "tajrīd", name: "Le dépouillement", explanation: "Se dépouiller de tout ce qui n'est pas Dieu, au-dehors comme au-dedans." },
      { id: "tafrid", arabic: "تفريد", translit: "tafrīd", name: "L'isolement en Dieu", explanation: "Ne plus voir que Dieu seul, unique dans Son action et dans Son être." },
      { id: "jam", arabic: "جمع", translit: "jamʿ", name: "La réunion", explanation: "Voir toute chose rassemblée en Dieu, sans dispersion." },
      { id: "tawhid", arabic: "توحيد", translit: "tawḥīd", name: "L'unicité", explanation: "Témoigner que Dieu est Un, en parole, en état et en réalité : le terme du chemin." },
    ],
  },
];

export type Station = Section["stations"][number] & { section: Section };

export const STATIONS: Station[] = SECTIONS.flatMap((section) => section.stations.map((station) => ({ ...station, section })));

export function stationById(id: string) {
  return STATIONS.find((station) => station.id === id);
}

// Les cinq réponses à « Où en suis-je ? ».
export const DEGREES = [0, 1, 2, 3, 4] as const;
export type Degree = (typeof DEGREES)[number];

// Durées proposées pour la station du mois, en jours.
export const FOCUS_LENGTHS = [30, 40] as const;

// Jour de la période en cours (1 le premier jour) ; au-delà de la durée, la période est finie.
export function focusDay(focus: { start: string; days: number }, today: string) {
  const [y1, m1, d1] = focus.start.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const elapsed = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  return { day: elapsed + 1, finished: elapsed + 1 > focus.days };
}
