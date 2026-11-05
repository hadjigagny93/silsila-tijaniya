"use client";

import { useSyncExternalStore } from "react";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

// Sans choix enregistré, le thème suit celui de l'appareil.
function isDark() {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === "dark" : window.matchMedia(SYSTEM_DARK).matches;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const system = window.matchMedia(SYSTEM_DARK);
  system.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    system.removeEventListener("change", onChange);
  };
}

export function useDarkTheme(initial = false) {
  return useSyncExternalStore(subscribe, isDark, () => initial);
}
