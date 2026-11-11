import { navigate, NotFoundSignal, RedirectSignal, refresh, useLocation } from "../navigation";

// Remplace next/navigation dans l'app iPhone.
export function redirect(url: string): never {
  throw new RedirectSignal(url);
}

export function permanentRedirect(url: string): never {
  throw new RedirectSignal(url);
}

export function notFound(): never {
  throw new NotFoundSignal();
}

export function usePathname() {
  return useLocation().location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(useLocation().location.search);
}

export function useRouter() {
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    refresh,
    prefetch: () => {},
  };
}
