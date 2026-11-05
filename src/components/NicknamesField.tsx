"use client";

import { useState } from "react";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

// Les sobriquets s'alignent en pastilles dans le champ ; Entrée en ajoute un.
export function NicknamesField({ defaultValue = [] }: { defaultValue?: string[] }) {
  const [nicknames, setNicknames] = useState(defaultValue);
  const [draft, setDraft] = useState("");

  function add() {
    const nickname = draft.trim();
    if (!nickname) return;
    const known = nicknames.some((item) => item.toLowerCase() === nickname.toLowerCase());
    if (!known) setNicknames([...nicknames, nickname]);
    setDraft("");
  }

  return (
    <div className="chips-field">
      {/* Un texte tapé sans valider est gardé : un clic sur Enregistrer ne doit rien perdre. */}
      <input type="hidden" name="nicknames" value={[...nicknames, draft.trim()].filter(Boolean).join("\n")} />
      {nicknames.map((nickname) => (
        <span key={nickname} className="nickname">
          {nickname}
          <button
            type="button"
            aria-label={t.admin.nicknameRemove(nickname)}
            className="nickname-remove"
            onClick={() => setNicknames(nicknames.filter((item) => item !== nickname))}
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        maxLength={120}
        aria-label={t.admin.nicknames}
        placeholder={t.admin.nicknamePlaceholder}
        className="chips-input"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && !draft && nicknames.length > 0) {
            setNicknames(nicknames.slice(0, -1));
          }
          if (event.key !== "Enter") return;
          // Entrée ajoute le sobriquet : elle ne doit pas envoyer le formulaire.
          event.preventDefault();
          add();
        }}
      />
    </div>
  );
}
