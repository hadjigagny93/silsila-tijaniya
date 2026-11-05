"use client";

import { useState } from "react";
import { linkMouqaddam } from "@/app/actions";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Avatar } from "./Avatar";
import { PersonPicker } from "./PersonPicker";

// Une chaîne à compléter : son sélecteur et son bouton, qui s'allume une fois le maître choisi.
export function PendingRow({
  person,
  parents,
  details,
  disciples,
}: {
  person: PublicPerson;
  parents: PublicPerson[];
  details: Record<string, string>;
  disciples: number;
}) {
  const [parentId, setParentId] = useState("");
  const place = person.birthCity ?? person.deathCity;

  return (
    <li>
      <form action={linkMouqaddam} className="pending-row">
        <input type="hidden" name="personId" value={person.id} />
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="pending-avatar">
            <Avatar person={person} size={42} />
          </span>
          <span className="min-w-0">
            <span className="picker-name">{person.displayName}</span>
            <span className="picker-detail">
              {[t.admin.disciples(disciples), place].filter(Boolean).join(" · ")}
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <PersonPicker
            name="mouqaddamId"
            persons={parents}
            required
            label={`${t.admin.received} ${person.displayName}`}
            emptyLabel={t.admin.receivedPlaceholder}
            details={details}
            onChange={setParentId}
          />
        </div>
        <button className={parentId ? "button" : "button-quiet"}>{t.admin.link}</button>
      </form>
    </li>
  );
}
