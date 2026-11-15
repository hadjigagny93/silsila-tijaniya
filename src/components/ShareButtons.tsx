"use client";

import { useEffect, useState } from "react";
import { siteUrl, X_HANDLE } from "@/lib/social";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

type Network = { key: string; label: string; href: (url: string, text: string) => string; path: React.ReactNode };

// Logos simplifiés, en couleur du texte.
const NETWORKS: Network[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    path: (
      <>
        <path
          d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.1 7.6c.3 0 .5 0 .7.5l.8 1.8c.1.3 0 .5-.1.7l-.5.6c-.1.2-.2.4 0 .6.4.8 1.6 2.1 2.9 2.6.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.3.1.4.3.4.5 0 .6-.3 1.4-1 1.8-.6.3-1.4.4-2.4 0-2.1-.8-4.2-2.8-5-4.8-.4-1-.3-1.9.1-2.6.3-.6.8-1 1.4-1z"
          fill="currentColor"
        />
      </>
    ),
  },
  {
    key: "x",
    label: "X",
    href: (url, text) =>
      `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=${X_HANDLE}`,
    path: (
      <path
        d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"
        fill="currentColor"
      />
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    path: (
      <path
        d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21z"
        fill="currentColor"
      />
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    href: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    path: (
      <path
        d="M20.7 4.2 2.9 11.1c-.9.4-.9 1.4 0 1.7l4.5 1.4 1.7 5.4c.2.7 1.1.9 1.6.4l2.5-2.3 4.6 3.4c.6.4 1.4.1 1.6-.6l3-14.4c.2-.9-.7-1.6-1.7-1.2zM9.7 14l8.1-7.3-6.4 8.6-.3 3z"
        fill="currentColor"
      />
    ),
  },
];

// Boutons de partage d'une page : le partage du téléphone quand il existe, puis les réseaux et la copie du lien.
// L'adresse partagée est toujours celle du site public, même depuis l'app Mac ou iPhone.
export function ShareButtons({
  path,
  text,
  label = t.share.label,
  compact = false,
}: {
  path: string;
  text: string;
  label?: string;
  compact?: boolean;
}) {
  const url = siteUrl(path);
  const [native, setNative] = useState(false);
  const [copied, setCopied] = useState(false);

  // Le partage natif n'est connu que dans le navigateur : on le découvre après l'affichage.
  useEffect(() => {
    if (typeof navigator.share === "function") queueMicrotask(() => setNative(true));
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className={`share${compact ? " share-compact" : ""}`}>
      {!compact && <span className="share-label">{label}</span>}
      <div className="share-buttons">
        {native && (
          <button
            type="button"
            className="share-button share-native"
            onClick={() => navigator.share({ title: text, text, url }).catch(() => {})}
          >
            <Icon name="share" size={17} />
            <span>{t.share.native}</span>
          </button>
        )}
        {NETWORKS.map((network) => (
          <a
            key={network.key}
            className={`share-button share-${network.key}`}
            href={network.href(url, text)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.share.on(network.label)}
            title={t.share.on(network.label)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              {network.path}
            </svg>
          </a>
        ))}
        <button
          type="button"
          className="share-button share-copy"
          onClick={copy}
          aria-label={t.share.copy}
          title={t.share.copy}
        >
          <Icon name={copied ? "check" : "link"} size={17} />
          {!compact && <span aria-live="polite">{copied ? t.share.copied : t.share.copy}</span>}
        </button>
      </div>
    </div>
  );
}
