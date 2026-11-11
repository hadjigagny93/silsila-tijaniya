"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { PersonPicker } from "./PersonPicker";
import { type Placement, TransmissionField } from "./TransmissionField";

// « Reçu de » (la chaîne dorée) et « A aussi reçu de » (les chaînes argentées). Un maître argenté peut devenir
// le maître doré : les deux échangent leur place.
export function MastersField({
  parents,
  defaultGolden,
  defaultSilver,
  details,
  placements,
  personId,
}: {
  parents: PublicPerson[];
  defaultGolden: string;
  defaultSilver: string[];
  details: Record<string, string>;
  placements: Record<string, Placement>;
  personId?: string;
}) {
  const [golden, setGolden] = useState(defaultGolden);
  const [silver, setSilver] = useState(defaultSilver);
  // Remonte « Reçu de » quand le maître doré change par un échange.
  const [round, setRound] = useState(0);
  const byId = new Map(parents.map((person) => [person.id, person]));
  const candidates = parents.filter(
    (person) => person.id !== personId && person.id !== golden && !silver.includes(person.id),
  );

  const promote = (id: string) => {
    setSilver([...silver.filter((other) => other !== id), ...(golden ? [golden] : [])]);
    setGolden(id);
    setRound(round + 1);
  };

  return (
    <div className="space-y-5">
      <TransmissionField
        key={round}
        parents={parents}
        defaultValue={golden}
        details={details}
        placements={placements}
        onChange={(id) => {
          setGolden(id);
          setSilver(silver.filter((other) => other !== id));
        }}
      />

      <div>
        <span className="field-label">{t.admin.alsoFrom}</span>
        <p className="field-help mb-2">{t.admin.alsoFromHelp}</p>
        {silver.map((id) => (
          <input key={id} type="hidden" name="alsoFrom" value={id} />
        ))}
        {silver.length > 0 && (
          <ul className="silver-masters">
            {silver.map((id) => {
              const master = byId.get(id);
              if (!master) return null;
              return (
                <li key={id}>
                  <Avatar person={master} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block">{master.displayName}</span>
                    {master.kind !== "prophet" && (
                      <Link href={`/admin/mouqaddams/${id}`} className="profile-link silver-profile">
                        {t.admin.viewProfile(master.displayName)}
                        <Icon name="arrowR" size={14} />
                      </Link>
                    )}
                  </span>
                  <button type="button" className="button-quiet silver-promote" onClick={() => promote(id)}>
                    {t.admin.makeGolden}
                  </button>
                  <button
                    type="button"
                    className="icon-quiet is-danger"
                    onClick={() => setSilver(silver.filter((other) => other !== id))}
                    aria-label={t.admin.removeMaster(master.displayName)}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <PersonPicker
          key={silver.join(",")}
          name="alsoFromPick"
          persons={candidates}
          label={t.admin.alsoFrom}
          emptyLabel={t.admin.addMaster}
          details={details}
          onChange={(id) => id && setSilver([...silver, id])}
        />
      </div>
    </div>
  );
}
