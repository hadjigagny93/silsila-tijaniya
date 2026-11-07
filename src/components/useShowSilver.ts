"use client";

import { useSyncExternalStore } from "react";

// Afficher ou non les chaînes argentées dans l'arbre : un choix retenu sur cet appareil (affichées par défaut).
const KEY = "silsila:chaines-argentees";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useShowSilver() {
  const shown = useSyncExternalStore(subscribe, read, () => true);
  const toggle = () => {
    try {
      localStorage.setItem(KEY, shown ? "0" : "1");
    } catch {
      // Sans stockage, le choix ne dure que le temps de la page.
    }
    listeners.forEach((listener) => listener());
  };
  return { shown, toggle };
}
