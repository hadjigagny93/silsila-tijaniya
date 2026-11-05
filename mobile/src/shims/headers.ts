// Remplace next/headers : les cookies sont ceux du navigateur de l'app (le thème clair ou sombre).
function parse() {
  return new Map(
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))] as const;
      }),
  );
}

export async function cookies() {
  const jar = parse();
  return {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    has: (name: string) => jar.has(name),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: () => {},
    delete: () => {},
  };
}

export async function headers() {
  return new Headers();
}
