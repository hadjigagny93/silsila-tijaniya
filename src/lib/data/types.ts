export type PersonKind = "prophet" | "cheikh" | "mouqaddam" | "member";
export type DisplayMode = "full" | "short";

export type PublicPerson = {
  id: string;
  kind: PersonKind;
  displayName: string;
  city: string | null;
  mouqaddamId: string | null;
  biographySlug: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  deathCity: string | null;
  deathCountry: string | null;
  zawiya: string | null;
  nicknames: string[];
  // Autres maîtres dont la personne a aussi reçu le wird : les chaînes argentées (la dorée est mouqaddamId).
  alsoFrom: string[];
  // Pôle spirituel (Qutb) : donnée gardée pour l'admin, sans effet visible.
  qutb: boolean;
  // Famille du Prophète ﷺ : un halo bleu entoure sa photo dans la Silsila.
  prophetFamily: boolean;
  hasImage: boolean;
  // Change avec l'image : force le navigateur à recharger la nouvelle.
  imageVersion?: string | null;
};

export type Profile = {
  id: string;
  fullName: string;
  displayMode: DisplayMode;
  city: string | null;
  mouqaddamId: string | null;
};

export type Session = {
  userId: string;
  email: string;
  isAdmin: boolean;
  // Application de bureau : un seul utilisateur, sans connexion.
  local?: boolean;
  profile: Profile | null;
};

export type ProfileInput = Omit<Profile, "id">;

export type MouqaddamRequest = {
  id: string;
  name: string;
  city: string | null;
  note: string | null;
};

export type Report = {
  id: string;
  personId: string;
  personName: string;
  reason: string;
};

export type NewMouqaddam = {
  name: string;
  mouqaddamId: string | null;
  kind: "cheikh" | "mouqaddam";
  birthDate: string | null;
  deathDate: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  deathCity: string | null;
  deathCountry: string | null;
  zawiya: string | null;
  nicknames: string[];
  qutb: boolean;
  prophetFamily: boolean;
  biographySlug: string | null;
};

export type Biography = {
  slug: string;
  name: string;
  summary: string;
  // Texte en Markdown.
  body: string;
  sources: string[];
  // Tant que ce champ est vrai, la page annonce que le texte est en relecture.
  draft: boolean;
  // Biographie inachevée : elle reste sur le Mac et l'iPhone, « Publier sur le site » ne l'envoie pas.
  localOnly: boolean;
  // Nom d'un fichier de images-cover ; vide, l'image est attribuée automatiquement.
  cover: string | null;
};

export type BiographyInput = {
  slug: string;
  name: string;
  summary: string;
  body: string;
  sources: string;
  draft: boolean;
  localOnly: boolean;
  cover: string | null;
  personId: string | null;
};

// Suluk : chaque utilisateur règle ses heures de prière et ses propres litanies.
export const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type Prayer = (typeof PRAYERS)[number];

export const PRAYER_METHODS = ["mwl", "egypt", "ummalqura", "moonsighting", "france", "morocco"] as const;
export type PrayerMethod = (typeof PRAYER_METHODS)[number];

export type SulukSettings = {
  city: string;
  latitude: number;
  longitude: number;
  method: PrayerMethod;
  // Fuseau horaire du lieu (IANA) : les heures s'affichent à l'heure locale de la ville.
  timezone: string;
};

export type LitanyItem = {
  name: string;
  arabic: string | null;
  // Nombre de répétitions ; vide pour une litanie composée comme le Lazim.
  count: number | null;
  note: string | null;
  // Temps estimé pour la faire, en minutes : la séance dure la somme de ses litanies.
  duration: number;
};

// Couleurs proposées pour les séances ; elles teintent leur durée sur le cadran.
export const GROUP_COLORS = ["#2f7d68", "#c08a2d", "#3f6fb0", "#8a4fa3", "#c0573e", "#3f9aa8", "#a3496b", "#6b7f2a"] as const;

// Une séance : les litanies faites ensemble, en une fois, au même moment.
export type LitanyGroup = {
  id: string;
  // Facultatif : sans nom, la séance se nomme d'après ses litanies.
  name: string | null;
  // Après une prière (décalée de offset minutes, négatif pour « avant »), à heure fixe,
  // ou enchaînée : elle commence à la fin de la séance follows, après une pause de offset minutes.
  anchor: Prayer | "fixed" | "after";
  offset: number;
  time: string | null;
  follows: string | null;
  // Jours de la semaine, 0 = dimanche.
  days: number[];
  items: LitanyItem[];
  color: string;
  position: number;
};

// Exercices spirituels, en trois familles : la Ḥilyat al-Abdāl d'Ibn ʿArabī, le cœur, la conduite.
export const EXERCISE_FAMILIES = {
  hilya: ["hunger", "silence", "solitude", "vigil"],
  heart: ["muhasaba", "muraqaba", "tafakkur"],
  conduct: ["khidma", "sadaqa", "adab", "ilm"],
} as const;
export type ExerciseFamily = keyof typeof EXERCISE_FAMILIES;
export const EXERCISE_KINDS = Object.values(EXERCISE_FAMILIES).flat();
export type ExerciseKind = (typeof EXERCISE_FAMILIES)[ExerciseFamily][number];

// Ceux-ci se tiennent sur une plage horaire ; les autres se cochent sur la journée.
export const SLOT_KINDS: readonly ExerciseKind[] = ["silence", "solitude", "vigil", "muhasaba", "muraqaba", "tafakkur", "ilm"];

// Un engagement : des jours, et pour les exercices à plage une heure de début et de fin « HH:MM ».
// La faim suit le jeûne, du Fajr au Maghrib. Une plage peut passer minuit : elle compte pour le jour où elle commence.
// note : le sujet de méditation, le livre en cours, ou la qualité travaillée cette semaine.
export type Exercise = {
  id: string;
  kind: ExerciseKind;
  days: number[];
  start: string | null;
  end: string | null;
  note: string | null;
  position: number;
};

// Ce qu'on écrit sur une journée : le service rendu, ou le bilan du soir (en JSON).
export type JournalEntry = { day: string; key: string; text: string };

// Jour au format AAAA-MM-JJ, à l'heure locale ; litany est l'identifiant de la séance,
// ou « abdal: » suivi de celui de l'exercice.
export type WirdEntry = { day: string; litany: string };

// L'Échiquier : où chacun pense en être, station par station, sans score ni total.
// degree : 0 pas encore, 1 je m'y exerce, 2 à 4 les trois degrés d'al-Harawī.
export type StationState = {
  station: string;
  degree: number;
  note: string | null;
  // Explication réécrite par l'utilisateur ; vide, celle de l'app s'affiche.
  explanation: string | null;
};

export type StationChange = { station: string; degree: number; at: string };

// Un moment vécu, pour les états (aḥwāl), qui passent et ne s'évaluent pas.
export type StationMoment = { id: string; station: string; day: string; text: string };

export type StationFocus = { station: string; start: string; days: number };

export type SignInResult = "signed-in" | "email-sent";

export type Store = {
  listPersons(): Promise<PublicPerson[]>;
  getSession(): Promise<Session | null>;
  signIn(email: string, redirectTo: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  saveProfile(userId: string, input: ProfileInput): Promise<void>;
  requestMouqaddam(userId: string, name: string, city: string | null, note: string | null): Promise<void>;
  reportPerson(userId: string, personId: string, reason: string): Promise<void>;
  // Réservé aux admins : vérifié dans les actions et, en production, par les règles RLS.
  listRequests(): Promise<MouqaddamRequest[]>;
  listReports(): Promise<Report[]>;
  addMouqaddam(input: NewMouqaddam): Promise<string>;
  updateMouqaddam(personId: string, input: NewMouqaddam): Promise<void>;
  deleteMouqaddam(personId: string): Promise<void>;
  // Image en JPEG, encodée en base64.
  setPersonImage(personId: string, base64: string | null): Promise<void>;
  getPersonImage(personId: string): Promise<Uint8Array | null>;
  // Personnes publiques avec une image propre : une image partagée par plusieurs (calligraphie par défaut) est écartée.
  listPortraits(): Promise<string[]>;
  linkMouqaddam(personId: string, mouqaddamId: string): Promise<void>;
  // Ville et pays de naissance (ou de décès), sans toucher au reste de la fiche.
  setPlace(personId: string, kind: "birth" | "death", city: string | null, country: string | null): Promise<void>;
  resolveRequest(id: string, status: "accepted" | "rejected"): Promise<void>;
  closeReport(id: string): Promise<void>;
  setHidden(personId: string, hidden: boolean): Promise<void>;
  // Remplace les maîtres « argentés » d'une personne (sans compter le maître doré, mouqaddamId).
  setAlsoFrom(personId: string, masterIds: string[]): Promise<void>;
  listBiographies(): Promise<Biography[]>;
  getBiography(slug: string): Promise<Biography | null>;
  saveBiography(input: BiographyInput): Promise<void>;
  setBiographyCover(slug: string, cover: string | null): Promise<void>;
  deleteBiography(slug: string): Promise<void>;
  // Suluk : espace privé, chacun ne lit et n'écrit que son propre wird.
  getSulukSettings(userId: string): Promise<SulukSettings | null>;
  // Premier passage : enregistre les réglages et les litanies proposées par défaut.
  initSuluk(userId: string, settings: SulukSettings, groups: LitanyGroup[]): Promise<void>;
  saveSulukSettings(userId: string, settings: SulukSettings): Promise<void>;
  listGroups(userId: string): Promise<LitanyGroup[]>;
  saveGroup(userId: string, group: LitanyGroup): Promise<void>;
  deleteGroup(userId: string, id: string): Promise<void>;
  listExercises(userId: string): Promise<Exercise[]>;
  saveExercise(userId: string, practice: Exercise): Promise<void>;
  deleteExercise(userId: string, id: string): Promise<void>;
  listJournal(userId: string, from: string, to: string): Promise<JournalEntry[]>;
  saveJournal(userId: string, day: string, key: string, text: string): Promise<void>;
  listStationStates(userId: string): Promise<StationState[]>;
  // Change le degré, la note ou l'explication ; un changement de degré entre dans l'historique.
  saveStationState(userId: string, state: StationState): Promise<void>;
  listStationHistory(userId: string, station: string): Promise<StationChange[]>;
  listStationMoments(userId: string): Promise<StationMoment[]>;
  addStationMoment(userId: string, moment: StationMoment): Promise<void>;
  deleteStationMoment(userId: string, id: string): Promise<void>;
  getStationFocus(userId: string): Promise<StationFocus | null>;
  setStationFocus(userId: string, focus: StationFocus | null): Promise<void>;
  listWird(userId: string, from: string, to: string): Promise<WirdEntry[]>;
  setWird(userId: string, day: string, litany: string, done: boolean): Promise<void>;
};
