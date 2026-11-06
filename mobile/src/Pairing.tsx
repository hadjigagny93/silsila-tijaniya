import { useState } from "react";
import { pair, parsePairingLink, syncNow, useSyncStatus } from "./syncClient";

// Premier lancement : l'iPhone ne contient rien tant qu'il n'est pas associé au Mac.
// On ne crée rien ici, pour ne jamais écraser les séances et réglages du Mac au premier échange.
export function PairingScreen() {
  const status = useSyncStatus();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const peer = parsePairingLink(link);
    if (!peer) {
      setError("Ce lien n'est pas un lien d'association Silsila.");
      return;
    }
    setError(null);
    await pair(peer);
  };

  return (
    <main className="pairing-screen">
      <h1 className="page-title">Silsila Tijaniya</h1>
      <p className="page-intro">
        Associe cet iPhone à ton Mac : il recevra toutes tes données, puis se synchronisera tout seul quand les deux
        sont sur le même Wi-Fi.
      </p>
      <ol className="pairing-steps mt-6">
        <li>Sur le Mac, ouvre l&apos;app, puis le menu Données › Associer un iPhone…</li>
        <li>Vise le QR code avec l&apos;appareil photo de l&apos;iPhone et touche le lien « Silsila ».</li>
      </ol>

      <details className="mt-6">
        <summary className="text-sm text-muted">Ou colle le lien d&apos;association</summary>
        <div className="mt-3 grid gap-2">
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="silsila://pair?…"
            className="field"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button type="button" className="button" onClick={() => void submit()}>
            Associer
          </button>
        </div>
      </details>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {status.state === "syncing" && <p className="mt-4">Réception des données du Mac…</p>}
      {status.state === "offline" && (
        <div className="mt-4">
          <p className="text-danger">{status.message}</p>
          <p className="mt-1 text-sm text-muted">Vérifie que le Mac est sur le même Wi-Fi et que l&apos;app y est ouverte.</p>
          <button type="button" className="button-quiet mt-2" onClick={() => void syncNow()}>
            Réessayer
          </button>
        </div>
      )}
    </main>
  );
}

const time = (at: number) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(at);

// Petite pastille en bas de l'écran : où en est la synchronisation ; la toucher la relance.
// compact : dans l'en-tête, seulement l'heure du dernier échange (ou « … », « hors ligne »).
export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const status = useSyncStatus();
  if (status.state === "unpaired") return null;
  const label =
    status.state === "syncing"
      ? compact
        ? "…"
        : "Synchronisation…"
      : status.state === "offline"
        ? compact
          ? "Hors ligne"
          : "Mac hors de portée"
        : status.at
          ? compact
            ? time(status.at)
            : `Synchronisé à ${time(status.at)}`
          : "Synchroniser";
  return (
    <button
      type="button"
      className={`sync-badge is-${status.state}`}
      onClick={() => void syncNow()}
      title={status.state === "offline" ? status.message : undefined}
    >
      <span aria-hidden className="sync-badge-dot" />
      {label}
    </button>
  );
}
