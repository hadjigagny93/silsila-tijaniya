import { cookies } from "next/headers";
import { shortName } from "@/lib/names";
import { seedPersons } from "./seed";
import type {
  DisplayMode,
  MouqaddamRequest,
  PersonKind,
  Report,
  Store,
} from "./types";

// Magasin en mémoire pour travailler sans Supabase. Activé par DEMO_MODE=1,
// jamais en production : n'importe qui peut s'y connecter sans vérification.

const COOKIE = "silsila_demo_email";
const ADMIN_EMAIL = "admin@demo.local";

type Row = {
  id: string;
  kind: PersonKind;
  fullName: string;
  displayMode: DisplayMode;
  city: string | null;
  mouqaddamId: string | null;
  biographySlug: string | null;
  userId: string | null;
  hidden: boolean;
};

type State = { persons: Row[]; requests: MouqaddamRequest[]; reports: Report[] };

const globalState = globalThis as unknown as { silsilaDemo?: State };

function state(): State {
  globalState.silsilaDemo ??= {
    persons: seedPersons.map((person) => ({
      ...person,
      displayMode: "full",
      city: null,
      userId: null,
      hidden: false,
    })),
    requests: [],
    reports: [],
  };
  return globalState.silsilaDemo;
}

function find(id: string): Row {
  const row = state().persons.find((person) => person.id === id);
  if (!row) throw new Error("Personne introuvable.");
  return row;
}

function assertLink(person: { id: string; kind: PersonKind }, mouqaddamId: string | null) {
  if (!mouqaddamId) return;
  const target = find(mouqaddamId);
  if (target.kind === "member") throw new Error("Le mouqaddam choisi ne fait pas partie de la liste.");
  if (target.kind === "prophet" && person.kind !== "cheikh") {
    throw new Error("Seul un cheikh peut être rattaché directement au Prophète.");
  }
  for (let cursor: string | null = mouqaddamId; cursor; cursor = find(cursor).mouqaddamId) {
    if (cursor === person.id) throw new Error("Ce rattachement créerait une boucle dans la chaîne.");
  }
}

export const demoStore: Store = {
  async listPersons() {
    return state()
      .persons.filter((person) => !person.hidden)
      .map((person) => ({
        id: person.id,
        kind: person.kind,
        displayName: person.displayMode === "short" ? shortName(person.fullName) : person.fullName,
        city: person.displayMode === "short" ? null : person.city,
        mouqaddamId: person.mouqaddamId,
        biographySlug: person.biographySlug,
      }));
  },

  async getSession() {
    const email = (await cookies()).get(COOKIE)?.value;
    if (!email) return null;
    const row = state().persons.find((person) => person.userId === email);
    return {
      userId: email,
      email,
      isAdmin: email === ADMIN_EMAIL,
      profile: row
        ? {
            id: row.id,
            fullName: row.fullName,
            displayMode: row.displayMode,
            city: row.city,
            mouqaddamId: row.mouqaddamId,
          }
        : null,
    };
  },

  async signIn(email) {
    (await cookies()).set(COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
    return "signed-in";
  },

  async signOut() {
    (await cookies()).delete(COOKIE);
  },

  async saveProfile(userId, input) {
    const existing = state().persons.find((person) => person.userId === userId);
    const id = existing?.id ?? crypto.randomUUID();
    assertLink({ id, kind: existing?.kind ?? "member" }, input.mouqaddamId);
    if (existing) {
      Object.assign(existing, input);
      return;
    }
    state().persons.push({
      ...input,
      id,
      kind: "member",
      biographySlug: null,
      userId,
      hidden: false,
    });
  },

  async requestMouqaddam(_userId, name, city, note) {
    state().requests.push({ id: crypto.randomUUID(), name, city, note });
  },

  async reportPerson(_userId, personId, reason) {
    const person = find(personId);
    const personName = person.displayMode === "short" ? shortName(person.fullName) : person.fullName;
    state().reports.push({ id: crypto.randomUUID(), personId, personName, reason });
  },

  async listRequests() {
    return state().requests;
  },

  async listReports() {
    return state().reports;
  },

  async addMouqaddam({ name, city, mouqaddamId }) {
    const id = crypto.randomUUID();
    assertLink({ id, kind: "mouqaddam" }, mouqaddamId);
    state().persons.push({
      id,
      kind: "mouqaddam",
      fullName: name,
      displayMode: "full",
      city,
      mouqaddamId,
      biographySlug: null,
      userId: null,
      hidden: false,
    });
  },

  async linkMouqaddam(personId, mouqaddamId) {
    const person = find(personId);
    assertLink(person, mouqaddamId);
    person.mouqaddamId = mouqaddamId;
  },

  async resolveRequest(id) {
    state().requests = state().requests.filter((request) => request.id !== id);
  },

  async closeReport(id) {
    state().reports = state().reports.filter((report) => report.id !== id);
  },

  async setHidden(personId, hidden) {
    find(personId).hidden = hidden;
  },
};
