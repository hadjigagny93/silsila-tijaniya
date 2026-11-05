"use client";

import { useSyncExternalStore } from "react";

const KEY = "suluk:cercles-masques";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Les cercles masqués du cadran, retenus sur cet appareil ; le rendu serveur les montre tous.
export function useHiddenRings() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const hidden = new Set(raw ? raw.split(",") : []);
  const toggle = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      localStorage.setItem(KEY, [...next].join(","));
    } catch {
      // Sans stockage, le choix ne dure que le temps de la page.
    }
    listeners.forEach((listener) => listener());
  };
  return { hidden, toggle };
}
