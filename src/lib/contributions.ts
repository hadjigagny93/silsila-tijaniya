// Contributions des visiteurs : ce qu'envoie l'assistant du site et ce que relit l'app Mac.
// Partagé entre le navigateur et le serveur : rien ici ne dépend de Node.

export type ContributionKind = "mouqaddam" | "biography" | "correction";
export const CONTRIBUTION_KINDS: ContributionKind[] = ["mouqaddam", "biography", "correction"];
// Adresse de chaque assistant sur le site : /contribuer/…
export const CONTRIBUTION_PATHS = { mouqaddam: "mouqaddam", biography: "biographie", correction: "correction" } as const;

export type MouqaddamPayload = {
  name: string;
  nicknames: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  zawiya: string;
  masterId: string | null;
  masterName: string;
  alsoFromId: string | null;
  notes: string;
};

export type TextPayload = { text: string; topics: string[] };

export type SourcePayload = { sourceKind: string; source: string };

export type ContributionInput = {
  kind: ContributionKind;
  personId: string | null;
  payload: (Partial<MouqaddamPayload> & Partial<TextPayload> & Partial<SourcePayload>) | null;
  photo: string | null;
  name: string;
  contact: string;
};

export type Contribution = {
  id: string;
  kind: ContributionKind;
  personId: string | null;
  payload: Partial<MouqaddamPayload> & Partial<TextPayload> & Partial<SourcePayload>;
  photo: string | null;
  contributorName: string | null;
  contributorContact: string | null;
  status: "new" | "accepted" | "rejected" | "done";
  resultId: string | null;
  createdAt: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO = /^[A-Za-z0-9+/=]+$/;

const line = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
const block = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
const id = (value: unknown) => (typeof value === "string" && UUID.test(value) ? value : null);

// Nettoie un envoi ; null si l'essentiel manque.
export function cleanContribution(input: unknown): ContributionInput | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const kind = CONTRIBUTION_KINDS.find((candidate) => candidate === raw.kind);
  if (!kind) return null;
  const data = (raw.payload && typeof raw.payload === "object" ? raw.payload : {}) as Record<string, unknown>;
  const sources = { sourceKind: line(data.sourceKind, 80), source: block(data.source, 2000) };
  const photo = typeof raw.photo === "string" && raw.photo.length < 1_400_000 && PHOTO.test(raw.photo) ? raw.photo : null;
  const common = { photo, name: line(raw.name, 120), contact: line(raw.contact, 200) };

  if (kind === "mouqaddam") {
    const payload = {
      name: line(data.name, 160),
      nicknames: line(data.nicknames, 300),
      birthDate: line(data.birthDate, 40),
      birthPlace: line(data.birthPlace, 120),
      deathDate: line(data.deathDate, 40),
      deathPlace: line(data.deathPlace, 120),
      zawiya: line(data.zawiya, 160),
      masterId: id(data.masterId),
      masterName: line(data.masterName, 160),
      alsoFromId: id(data.alsoFromId),
      notes: block(data.notes, 20000),
      ...sources,
    };
    if (payload.name.length < 2 || (!payload.masterId && payload.masterName.length < 2)) return null;
    return { kind, personId: null, payload, ...common };
  }

  const personId = id(raw.personId);
  const topics = Array.isArray(data.topics) ? data.topics.map((topic) => line(topic, 40)).filter(Boolean).slice(0, 8) : [];
  const payload = { text: block(data.text, 20000), topics, ...sources };
  if (!personId) return null;
  if (kind === "biography" && payload.text.length < 10) return null;
  if (kind === "correction" && payload.text.length < 3 && !photo) return null;
  return { kind, personId, payload, ...common };
}

// « Kaolack, Sénégal » → ville et pays.
export function splitPlace(place: string | undefined) {
  const [city, ...rest] = (place ?? "").split(",").map((part) => part.trim());
  return { city: city || null, country: rest.join(", ") || null };
}
