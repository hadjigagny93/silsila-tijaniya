import type { PublicPerson } from "@/lib/data/types";

// Lieux connus de la carte, sans connexion : villes de la voie et grandes villes, puis un point par pays
// (sa capitale) quand la ville n'est pas dans la liste. Latitude, longitude.
type Point = [number, number];

const CITIES: Record<string, Point> = {
  // Sénégal
  dakar: [14.6928, -17.4467],
  rufisque: [14.7167, -17.2667],
  tivaouane: [14.95, -16.8167],
  ndiassane: [14.97, -16.77],
  pire: [14.93, -16.99],
  thies: [14.791, -16.9256],
  kaolack: [14.152, -16.0726],
  leona: [14.152, -16.0726],
  "medina baye": [14.16, -16.08],
  "saint-louis": [16.0179, -16.4896],
  podor: [16.6528, -14.9594],
  dagana: [16.5167, -15.5],
  mpal: [15.9167, -16.2667],
  louga: [15.6167, -16.2333],
  kebemer: [15.37, -16.45],
  linguere: [15.3953, -15.1194],
  djolof: [15.3953, -15.1194],
  djollof: [15.3953, -15.1194],
  touba: [14.85, -15.88],
  diourbel: [14.655, -16.2314],
  mbour: [14.4167, -16.9667],
  fatick: [14.339, -16.4111],
  kaffrine: [14.1059, -15.5508],
  "nioro du rip": [13.75, -15.7833],
  tambacounda: [13.77, -13.6672],
  ziguinchor: [12.5833, -16.2719],
  matam: [15.6559, -13.2554],
  // Mauritanie
  nouakchott: [18.0735, -15.9582],
  chinguetti: [20.463, -12.362],
  chinguit: [20.463, -12.362],
  atar: [20.5169, -13.0499],
  boutilimit: [17.55, -14.7],
  tidjikja: [18.55, -11.4333],
  kiffa: [16.6166, -11.4],
  kaedi: [16.15, -13.5],
  rosso: [16.5138, -15.805],
  nouadhibou: [20.94, -17.04],
  // Mali
  bamako: [12.6392, -8.0029],
  bandiagara: [14.35, -3.6167],
  segou: [13.4317, -6.2157],
  "nioro du sahel": [15.2333, -9.5833],
  tombouctou: [16.7666, -3.0026],
  djenne: [13.9061, -4.5533],
  kayes: [14.45, -11.4333],
  // Maroc
  fes: [34.0331, -5.0003],
  fez: [34.0331, -5.0003],
  marrakech: [31.6295, -7.9811],
  rabat: [34.0209, -6.8416],
  sale: [34.0531, -6.7985],
  casablanca: [33.5731, -7.5898],
  meknes: [33.8935, -5.5473],
  tanger: [35.7595, -5.834],
  tetouan: [35.5785, -5.3684],
  oujda: [34.6814, -1.9086],
  demnate: [31.7316, -7.0],
  // Algérie, Tunisie, Libye, Égypte
  "ain madhi": [34.0, 2.3],
  laghouat: [33.8, 2.8833],
  temacine: [33.0167, 6.0167],
  touggourt: [33.1, 6.0667],
  tlemcen: [34.8783, -1.315],
  alger: [36.7538, 3.0588],
  oran: [35.6971, -0.6308],
  tunis: [36.8065, 10.1815],
  tripoli: [32.8872, 13.1913],
  "le caire": [30.0444, 31.2357],
  caire: [30.0444, 31.2357],
  // Arabie, Levant, Turquie
  "la mecque": [21.3891, 39.8579],
  mecque: [21.3891, 39.8579],
  medine: [24.4686, 39.6142],
  damas: [33.5138, 36.2765],
  istanbul: [41.0082, 28.9784],
  // Afrique de l'Ouest et du Centre
  kano: [12.0022, 8.592],
  abuja: [9.0765, 7.3986],
  lagos: [6.5244, 3.3792],
  zaria: [11.0855, 7.7199],
  sokoto: [13.0059, 5.2476],
  maiduguri: [11.8333, 13.15],
  niamey: [13.5116, 2.1254],
  accra: [5.6037, -0.187],
  kumasi: [6.6885, -1.6244],
  banjul: [13.4549, -16.579],
  conakry: [9.6412, -13.5784],
  bissau: [11.8817, -15.6178],
  abidjan: [5.36, -4.0083],
  ouagadougou: [12.3714, -1.5197],
  "n'djamena": [12.1348, 15.0557],
  khartoum: [15.5007, 32.5599],
  // Europe et Amériques
  londres: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  marseille: [43.2965, 5.3698],
  lyon: [45.764, 4.8357],
  bruxelles: [50.8503, 4.3517],
  madrid: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  milan: [45.4642, 9.19],
  "new york": [40.7128, -74.006],
  washington: [38.9072, -77.0369],
  atlanta: [33.749, -84.388],
  montreal: [45.5017, -73.5673],
};

const COUNTRIES: Record<string, Point> = {
  senegal: [14.6928, -17.4467],
  mauritanie: [18.0735, -15.9582],
  mali: [12.6392, -8.0029],
  maroc: [34.0209, -6.8416],
  algerie: [36.7538, 3.0588],
  tunisie: [36.8065, 10.1815],
  libye: [32.8872, 13.1913],
  egypte: [30.0444, 31.2357],
  soudan: [15.5007, 32.5599],
  tchad: [12.1348, 15.0557],
  niger: [13.5116, 2.1254],
  nigeria: [9.0765, 7.3986],
  ghana: [5.6037, -0.187],
  gambie: [13.4549, -16.579],
  guinee: [9.6412, -13.5784],
  "guinee-bissau": [11.8817, -15.6178],
  "cote d'ivoire": [6.8276, -5.2893],
  "burkina faso": [12.3714, -1.5197],
  cameroun: [3.848, 11.5021],
  "arabie saoudite": [24.7136, 46.6753],
  syrie: [33.5138, 36.2765],
  turquie: [39.9334, 32.8597],
  france: [48.8566, 2.3522],
  angleterre: [51.5074, -0.1278],
  "royaume-uni": [51.5074, -0.1278],
  belgique: [50.8503, 4.3517],
  espagne: [40.4168, -3.7038],
  italie: [41.9028, 12.4964],
  "etats-unis": [38.9072, -77.0369],
  canada: [45.4215, -75.6972],
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .trim();

// Une ville écrite « Léona, Kaolack » : on essaie chaque morceau, le plus précis d'abord.
function cityPoint(city: string) {
  for (const part of city.split(",")) {
    const point = CITIES[normalize(part)];
    if (point) return { point, name: part.trim() };
  }
  return null;
}

export type Place = {
  key: string;
  // Nom affiché sur la carte : la ville reconnue, ou le pays.
  name: string;
  lat: number;
  lon: number;
  // Faux quand seul le pays est connu : la personne est posée sur sa capitale.
  precise: boolean;
};

// Le lieu d'une personne sur la carte : sa ville (où elle vit ou enseigne), sinon le lieu de son décès,
// sinon celui de sa naissance.
export function placeOf(person: PublicPerson): Place | null {
  const candidates: [string | null, string | null][] = [
    [person.city, null],
    [person.deathCity, person.deathCountry],
    [person.birthCity, person.birthCountry],
  ];
  for (const [city] of candidates) {
    const found = city ? cityPoint(city) : null;
    if (found) {
      return {
        key: `c:${found.point.join(",")}`,
        name: found.name,
        lat: found.point[0],
        lon: found.point[1],
        precise: true,
      };
    }
  }
  for (const [, country] of candidates) {
    const point = country ? COUNTRIES[normalize(country)] : null;
    if (point)
      return { key: `p:${normalize(country!)}`, name: country!.trim(), lat: point[0], lon: point[1], precise: false };
  }
  return null;
}
