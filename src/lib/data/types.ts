export type PersonKind = "prophet" | "cheikh" | "mouqaddam" | "member";
export type DisplayMode = "full" | "short";

export type PublicPerson = {
  id: string;
  kind: PersonKind;
  displayName: string;
  city: string | null;
  mouqaddamId: string | null;
  biographySlug: string | null;
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
  city: string | null;
  mouqaddamId: string | null;
};

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
  addMouqaddam(input: NewMouqaddam): Promise<void>;
  linkMouqaddam(personId: string, mouqaddamId: string): Promise<void>;
  resolveRequest(id: string, status: "accepted" | "rejected"): Promise<void>;
  closeReport(id: string): Promise<void>;
  setHidden(personId: string, hidden: boolean): Promise<void>;
};
