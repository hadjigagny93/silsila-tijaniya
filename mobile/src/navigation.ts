import { useSyncExternalStore } from "react";

// Navigation de l'app iPhone : l'adresse courante, et un numéro de version qui force le rechargement
// des données de la page après une écriture (l'équivalent de revalidatePath côté serveur).
type Location = { pathname: string; search: string; hash: string };

const listeners = new Set<() => void>();
let location: Location = read();
let version = 0;
let snapshot = { location, version };

function read(): Location {
  return { pathname: window.location.pathname, search: window.location.search, hash: window.location.hash };
}

function emit() {
  snapshot = { location, version };
  listeners.forEach((listener) => listener());
}

window.addEventListener("popstate", () => {
  location = read();
  emit();
});

export function navigate(href: string, { replace = false } = {}) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) {
    window.open(url.href, "_blank");
    return;
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (replace) window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
  const samePage = url.pathname === location.pathname && url.search === location.search;
  location = read();
  // Même page, autre ancre : on fait seulement défiler.
  if (samePage && url.hash) {
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: "smooth" });
  } else if (!url.hash) {
    window.scrollTo(0, 0);
  }
  emit();
}

// Après une écriture : la page courante recharge ses données.
export function refresh() {
  version++;
  emit();
}

export function useLocation() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}

// Signaux lancés par redirect() et notFound(), comme dans Next.
export class RedirectSignal extends Error {
  constructor(readonly url: string) {
    super(`redirect:${url}`);
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("not-found");
  }
}
