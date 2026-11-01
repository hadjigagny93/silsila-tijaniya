export type Biography = {
  slug: string;
  name: string;
  period: string;
  summary: string;
  paragraphs: string[];
  // Tant que ce champ est vrai, la page annonce que le texte est en relecture.
  draft: boolean;
};

export const biographies: Biography[] = [
  {
    slug: "ahmad-tijani",
    name: "Cheikh Ahmad Tijani",
    period: "1737 – 1815",
    summary: "Fondateur de la voie Tijaniya, né à Aïn Madhi et enterré à Fès.",
    paragraphs: [
      "Cheikh Ahmad Tijani naît en 1737 à Aïn Madhi, dans l'actuelle Algérie. Il y reçoit une première formation dans les sciences religieuses, puis voyage pour étudier auprès de maîtres de plusieurs voies soufies, au Maghreb, en Égypte et dans les villes saintes du Hedjaz.",
      "La tradition de la voie rapporte qu'à Abou Samghoun, vers 1782, il reçoit du Prophète ﷺ lui-même, en état de veille, l'autorisation de transmettre le wird. C'est ce lien direct qui place la Tijaniya au sommet de chaque chaîne de transmission.",
      "Il s'installe ensuite à Fès, où il fonde sa zawiya. Il y meurt en 1815 et y est enterré ; sa tombe demeure un lieu de visite majeur pour les disciples du monde entier.",
    ],
    draft: true,
  },
  {
    slug: "ali-harazem",
    name: "Sidi Ali Harazem Berrada",
    period: "",
    summary: "Disciple proche de Cheikh Ahmad Tijani et compilateur de Jawahir al-Ma'ani.",
    paragraphs: [
      "Originaire de Fès, Sidi Ali Harazem Berrada compte parmi les plus proches compagnons de Cheikh Ahmad Tijani.",
      "Il est connu avant tout pour avoir rassemblé Jawahir al-Ma'ani, recueil des enseignements et de la vie du Cheikh, qui reste un ouvrage de référence de la voie.",
    ],
    draft: true,
  },
  {
    slug: "omar-tall",
    name: "El Hadj Omar Tall",
    period: "vers 1797 – 1864",
    summary: "Savant et chef religieux du Fouta Toro, grande figure de la Tijaniya en Afrique de l'Ouest.",
    paragraphs: [
      "El Hadj Omar Tall naît vers 1797 à Halwar, dans le Fouta Toro, sur le territoire de l'actuel Sénégal.",
      "Au cours de son pèlerinage, il reçoit à La Mecque l'autorisation de Sidi Muhammad al-Ghali, disciple de Cheikh Ahmad Tijani, et devient khalife de la voie pour l'Afrique de l'Ouest.",
      "De retour, il enseigne, écrit, notamment le Rimah, et conduit de vastes campagnes qui fondent un empire dans la région du Niger. Il meurt en 1864 dans les falaises de Bandiagara, dans l'actuel Mali.",
    ],
    draft: true,
  },
  {
    slug: "malick-sy",
    name: "El Hadj Malick Sy",
    period: "vers 1855 – 1922",
    summary: "Savant et éducateur, il fait de Tivaouane l'un des grands foyers de la Tijaniya au Sénégal.",
    paragraphs: [
      "El Hadj Malick Sy naît vers 1855 à Gaya, dans la région du fleuve Sénégal. Il reçoit très tôt une formation approfondie dans les sciences islamiques.",
      "Après son pèlerinage à La Mecque, il se consacre à l'enseignement et à la diffusion de la voie. Il s'établit à Tivaouane au début du XXe siècle et y fonde une zawiya qui rayonne dans tout le pays.",
      "Il est aussi connu pour ses écrits et pour la place qu'il a donnée à la célébration du Gamou. Il meurt à Tivaouane en 1922.",
    ],
    draft: true,
  },
  {
    slug: "abdoulaye-niasse",
    name: "Cheikh Abdoulaye Niasse",
    period: "mort en 1922",
    summary: "Savant de la région de Kaolack, à l'origine de la branche niassène de la Tijaniya.",
    paragraphs: [
      "Cheikh Abdoulaye Niasse est un savant et guide tijani du Saloum, dans l'actuel Sénégal.",
      "Il fonde à Kaolack la zawiya de Léona, d'où rayonne la branche niassène de la voie. Il meurt en 1922, et son fils Cheikh Ibrahima Niasse prolonge son œuvre.",
    ],
    draft: true,
  },
  {
    slug: "ibrahima-niasse",
    name: "Cheikh Ibrahima Niasse",
    period: "1900 – 1975",
    summary: "Fondateur de Médina Baye, dont le mouvement de la Fayda s'est étendu bien au-delà du Sénégal.",
    paragraphs: [
      "Cheikh Ibrahima Niasse, appelé Baye Niasse, naît en 1900 à Taïba Niassène, dans le Saloum. Il est le fils de Cheikh Abdoulaye Niasse et reçoit de lui sa formation.",
      "Il fonde vers 1930 Médina Baye, à Kaolack. Autour de lui se développe le mouvement de la Fayda, qui rassemble des disciples nombreux en Afrique de l'Ouest, notamment au Nigeria, et au-delà.",
      "Auteur d'une œuvre importante, il meurt à Londres en 1975 et repose à Médina Baye.",
    ],
    draft: true,
  },
];

export function getBiography(slug: string) {
  return biographies.find((biography) => biography.slug === slug);
}
