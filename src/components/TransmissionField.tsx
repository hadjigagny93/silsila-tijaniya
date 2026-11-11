"use client";

import { useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { PersonPicker } from "./PersonPicker";

export type Placement = { generation: number | null; links: number | null };

// « Reçu de », puis la place que la personne prendra : génération et maillons.
export function TransmissionField({
  parents,
  defaultValue,
  details,
  placements,
  onChange,
}: {
  parents: PublicPerson[];
  defaultValue: string;
  details: Record<string, string>;
  // Pour chaque maître possible : où se placera celui qui a reçu de lui.
  placements: Record<string, Placement>;
  onChange?: (id: string) => void;
}) {
  const [parent, setParent] = useState(defaultValue);
  const placement = parent ? placements[parent] : null;

  return (
    <div>
      <span className="field-label">{t.admin.parent}</span>
      <PersonPicker
        name="mouqaddamId"
        persons={parents}
        defaultValue={defaultValue}
        label={t.admin.parent}
        emptyLabel={t.admin.none}
        profileBase="/admin/mouqaddams"
        details={details}
        onChange={(id) => {
          setParent(id);
          onChange?.(id);
        }}
      />
      <p className="field-help">
        {!placement
          ? t.admin.placementNone
          : placement.links === null
            ? t.admin.placementPending
            : t.admin.placement(placement.generation, placement.links)}
      </p>
    </div>
  );
}
