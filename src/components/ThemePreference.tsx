"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/messages/fr";
import { Icon } from "./Icon";

type Choice = "light" | "dark" | "system";
const ONE_YEAR = 60 * 60 * 24 * 365;

function current(): Choice {
  const chosen = document.documentElement.dataset.theme;
  return chosen === "light" || chosen === "dark" ? chosen : "system";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

// Le même cookie que le bouton lune / soleil ; sans choix, on suit l'appareil.
function choose(next: Choice) {
  const root = document.documentElement;
  if (next === "system") {
    root.removeAttribute("data-theme");
    document.cookie = "theme=; path=/; max-age=0; samesite=lax";
  } else {
    root.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }
}

export function ThemePreference({ initial }: { initial: Choice }) {
  const choice = useSyncExternalStore(subscribe, current, () => initial);

  const options: { value: Choice; label: string; icon?: "sun" | "moon" }[] = [
    { value: "light", label: t.account.themeLight, icon: "sun" },
    { value: "dark", label: t.account.themeDark, icon: "moon" },
    { value: "system", label: t.account.themeSystem },
  ];

  return (
    <div role="radiogroup" aria-label={t.account.theme} className="segmented">
      {options.map((option) => (
        <label key={option.value}>
          <input type="radio" name="theme-choice" checked={choice === option.value} onChange={() => choose(option.value)} />
          <span>
            {option.icon && <Icon name={option.icon} size={16} />}
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
