"use client";

import { useSyncExternalStore } from "react";

// Un interrupteur de l'arbre retenu sur cet appareil (chaînes argentées, tous les noms…).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useStoredToggle(key: string, fallback: boolean) {
  const read = () => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === "1";
    } catch {
      return fallback;
    }
  };
  const shown = useSyncExternalStore(subscribe, read, () => fallback);
  const toggle = () => {
    try {
      localStorage.setItem(key, shown ? "0" : "1");
    } catch {
      // Sans stockage, le choix ne dure que le temps de la page.
    }
    listeners.forEach((listener) => listener());
  };
  return { shown, toggle };
}
