"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setPersonPlace } from "@/app/actions";
import type { PublicPerson } from "@/lib/data/types";
import type { PlaceChoices } from "@/lib/places";
import { t } from "@/messages/fr";
import { PlaceFields } from "./PlaceFields";

// Compléter la ville et le pays d'une personne sans quitter la silsila : naissance ou décès, au choix.
export function PlaceQuickForm({
  person,
  choices,
  onSaved,
  onCancel,
}: {
  person: PublicPerson;
  choices: PlaceChoices;
  onSaved(place: Pick<PublicPerson, "birthCity" | "birthCountry" | "deathCity" | "deathCountry">): void;
  onCancel(): void;
}) {
  const [kind, setKind] = useState<"birth" | "death">("birth");
  const [failed, setFailed] = useState(false);
  const [saving, startSaving] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  // À l'ouverture : le formulaire entier en vue dans la liste.
  useEffect(() => {
    form.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <form
      ref={form}
      className="place-quick"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("personId", person.id);
        form.set("kind", kind);
        const value = (name: string) => String(form.get(name) ?? "").trim() || null;
        startSaving(async () => {
          try {
            await setPersonPlace(form);
            onSaved(
              kind === "birth"
                ? { ...person, birthCity: value("birthCity"), birthCountry: value("birthCountry") }
                : { ...person, deathCity: value("deathCity"), deathCountry: value("deathCountry") },
            );
          } catch {
            setFailed(true);
          }
        });
      }}
    >
      <div role="radiogroup" aria-label={t.silsila.placeOf} className="segmented place-kind">
        {(["birth", "death"] as const).map((option) => (
          <label key={option}>
            <input type="radio" checked={kind === option} onChange={() => setKind(option)} />
            <span>{option === "birth" ? t.admin.birth : t.admin.death}</span>
          </label>
        ))}
      </div>
      <PlaceFields
        key={kind}
        prefix={kind}
        city={(kind === "birth" ? person.birthCity : person.deathCity) ?? ""}
        country={(kind === "birth" ? person.birthCountry : person.deathCountry) ?? ""}
        choices={choices}
      />
      {failed && <p className="text-sm text-danger">{t.errors.invalid}</p>}
      <div className="flex gap-2">
        <button type="submit" className="button" disabled={saving}>
          {t.admin.save}
        </button>
        <button type="button" className="button-quiet" onClick={onCancel}>
          {t.admin.cancel}
        </button>
      </div>
    </form>
  );
}
