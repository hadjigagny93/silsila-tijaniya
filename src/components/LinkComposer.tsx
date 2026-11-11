"use client";

import { useState } from "react";
import { chainOf, generationsOf } from "@/lib/chain";
import type { PublicPerson } from "@/lib/data/types";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";
import { PersonPicker } from "./PersonPicker";

// La phrase se lit comme une transmission : « [personne] a reçu de [maître] ».
export function LinkComposer({
  persons,
  candidates,
  parents,
  details,
}: {
  persons: PublicPerson[];
  candidates: PublicPerson[];
  parents: PublicPerson[];
  details: Record<string, string>;
}) {
  const [personId, setPersonId] = useState("");
  const [parentId, setParentId] = useState("");
  const person = persons.find((candidate) => candidate.id === personId);
  const { chain, complete } = parentId ? chainOf(persons, parentId) : { chain: [], complete: false };
  const rank = generationsOf(persons).get(parentId);
  const founder = persons.find((candidate) => candidate.id === parentId)?.kind === "cheikh" && chain.length === 2;
  const generation = rank ? rank + 1 : founder ? 1 : null;

  return (
    <div className="panel link-panel">
      <div className="link-sentence">
        <div className="min-w-0 flex-1">
          <span className="field-label">{t.admin.person}</span>
          <PersonPicker
            name="personId"
            persons={candidates}
            required
            label={t.admin.person}
            emptyLabel={t.admin.choose}
            details={details}
            onChange={setPersonId}
          />
        </div>
        <span className="link-verb">{t.admin.receivedFrom}</span>
        <div className="min-w-0 flex-1">
          <span className="field-label">{t.admin.master}</span>
          <PersonPicker
            name="mouqaddamId"
            persons={parents.filter((parent) => parent.id !== personId)}
            required
            label={t.admin.master}
            emptyLabel={t.admin.choose}
            details={details}
            onChange={setParentId}
          />
        </div>
        <button className="button">
          <Icon name="link" size={16} />
          {t.admin.link}
        </button>
      </div>

      {person && parentId && (
        <div className="chain-preview">
          <span className="text-sm text-muted">
            {t.admin.chainResult(generation, complete ? chain.length : null)}
          </span>
          <ol className="chain-chips">
            {[...chain, person].map((link, index) => (
              <li key={link.id} data-kind={link.kind} data-last={index === chain.length || undefined}>
                {link.kind === "prophet" ? <span className="saw" title={link.displayName}>ﷺ</span> : link.displayName}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
