// Le thème clair ou sombre est gardé dans un cookie « theme » (voir ThemeToggle et ThemePreference).
// Dans l'app iPhone, WebKit ne conserve pas les cookies de l'adresse capacitor:// : on garde donc le
// choix dans le stockage local, et le cookie lu par les pages (shims/headers.ts) vient de là.
const KEY = "silsila:theme";

export function savedTheme() {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function rememberTheme() {
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      const theme = savedTheme();
      const cookies = String(descriptor.get!.call(document))
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part && !part.startsWith("theme="));
      return [...cookies, ...(theme ? [`theme=${theme}`] : [])].join("; ");
    },
    set(value: string) {
      const found = /^theme=([^;]*)/.exec(value);
      if (found) {
        try {
          if (found[1] === "light" || found[1] === "dark") localStorage.setItem(KEY, found[1]);
          else localStorage.removeItem(KEY);
        } catch {
          // Sans stockage local, le choix dure le temps de la session.
        }
      }
      descriptor.set!.call(document, value);
    },
  });
  // Dès l'ouverture, avant la première page : pas d'éclair du mauvais thème.
  const theme = savedTheme();
  if (theme) document.documentElement.dataset.theme = theme;
}
