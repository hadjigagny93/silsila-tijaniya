"use client";

import { t } from "@/messages/fr";
import { useDarkTheme } from "./useDarkTheme";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  const dark = useDarkTheme(initialDark);
  const label = dark ? t.nav.lightMode : t.nav.darkMode;

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // Un cookie plutôt que le stockage local : l'app change de port à chaque ouverture,
    // et le serveur peut poser le bon thème dès la première image.
    document.cookie = `theme=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
