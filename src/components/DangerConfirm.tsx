"use client";

import { useState } from "react";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// Une action destructrice demande de taper le nom concerné.
export function DangerConfirm({
  action,
  label,
  question,
  impact,
  expected,
  fields,
}: {
  action: (form: FormData) => Promise<void>;
  label: string;
  question: string;
  impact?: React.ReactNode;
  expected: string;
  fields?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === expected.trim().toLowerCase();

  if (!open) {
    return (
      <button type="button" className="button-danger w-full" onClick={() => setOpen(true)}>
        <Icon name="trash" size={16} />
        {label}
      </button>
    );
  }

  return (
    <div className="danger-box">
      <p className="flex items-center gap-2 font-semibold text-danger">
        <Icon name="alert" />
        {question}
      </p>
      {impact && <div className="mt-2 text-sm">{impact}</div>}
      <p className="mt-2 text-sm">
        {t.admin.typeToConfirm[0]}
        <b>{expected}</b>
        {t.admin.typeToConfirm[1]}
      </p>
      {fields && Object.entries(fields).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={typed}
          autoFocus
          aria-label={t.admin.typeToConfirmLabel(expected)}
          className="field min-w-0 flex-1"
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            // Entrée ne doit pas envoyer le formulaire principal par erreur.
            if (event.key === "Enter") event.preventDefault();
          }}
        />
        <button formAction={action} formNoValidate disabled={!matches} className="button-danger" data-filled>
          {t.admin.delete}
        </button>
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          {t.admin.cancel}
        </button>
      </div>
    </div>
  );
}
