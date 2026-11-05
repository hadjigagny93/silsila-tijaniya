"use client";

import { useSyncExternalStore } from "react";

const TICK = 15000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, TICK);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// L'heure ne vit que dans le navigateur : le rendu serveur affiche le jour sans aiguille.
export function useNow() {
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK),
    () => 0,
  );
  return tick ? new Date(tick * TICK) : null;
}
