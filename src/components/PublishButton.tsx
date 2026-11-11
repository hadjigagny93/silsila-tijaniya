"use client";

import { useEffect, useState } from "react";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

type Last = { at: string; persons: number; images: number; biographies: number };
type Status = { ready: boolean; last: Last | null };

// Bouton de l'app Mac : recopie la base locale sur le site en ligne. Invisible ailleurs (iPhone, site),
// où la route /api/publication n'existe pas.
export function PublishButton() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/publication")
      .then((response) => (response.ok ? response.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/publication", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setMessage({ ok: false, text: body.error === "missing-key" ? t.publish.missingKey : t.publish.failed });
        return;
      }
      setStatus({ ready: true, last: body });
      setMessage({ ok: true, text: t.publish.done(body.persons, body.images, body.biographies) });
    } catch {
      setMessage({ ok: false, text: t.publish.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="publish">
      <button
        type="button"
        className="nav-link publish-button"
        onClick={publish}
        disabled={busy || !status.ready}
        title={status.ready ? t.publish.hint : t.publish.missingKey}
      >
        <Icon name="upload" />
        <span className="nav-label">{busy ? t.publish.busy : t.publish.label}</span>
      </button>
      <p className="publish-status" role="status">
        {message ? (
          <span data-ok={message.ok}>{message.text}</span>
        ) : !status.ready ? (
          t.publish.missingKey
        ) : status.last ? (
          t.publish.last(new Date(status.last.at))
        ) : (
          t.publish.never
        )}
      </p>
    </div>
  );
}
