import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// L'app iPhone réutilise les pages et composants de src/ tels quels. Ce qui tient au serveur Next
// (navigation, cookies, actions serveur, accès à la base) est remplacé par des équivalents qui tournent
// dans l'app, sur la base SQLite du téléphone.
const root = resolve(__dirname, "..");
const src = (path: string) => resolve(root, "src", path);
const here = (path: string) => resolve(__dirname, "src", path);

// Modules de src/ remplacés dans l'app, quelle que soit la façon dont ils sont importés (« @/lib/data », « ./data »…).
const replaced: Record<string, string> = {
  [src("lib/data/index.ts")]: here("data.ts"),
  [src("lib/covers.ts")]: here("covers.ts"),
};

function replaceServerModules(): Plugin {
  return {
    name: "silsila-mobile-replace",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved) return null;
      return replaced[resolved.id.split("?")[0]] ?? null;
    },
  };
}

// Les actions serveur (src/app/actions.ts) tournent ici dans l'app : chacune est enveloppée pour que
// redirect() navigue, que la page recharge ses données, et qu'une synchronisation suive l'écriture.
function wrapActions(): Plugin {
  const file = src("app/actions.ts");
  return {
    name: "silsila-mobile-actions",
    enforce: "pre",
    transform(code, id) {
      if (id.split("?")[0] !== file) return null;
      const names: string[] = [];
      const body = code
        .replace(/^"use server";/m, "")
        .replace(/^export async function (\w+)\(/gm, (_, name: string) => {
          names.push(name);
          return `async function __${name}(`;
        });
      const exports = names.map((name) => `export const ${name} = __wrap(__${name});`).join("\n");
      return `import { wrapAction as __wrap } from ${JSON.stringify(here("actionRuntime.ts"))};\n${body}\n${exports}\n`;
    },
  };
}

// Images de l'app (couvertures, stations) : servies telles quelles en développement, copiées dans l'app
// à la construction, et listées dans un module virtuel à la place de la lecture du disque.
const IMAGE_FOLDERS = ["images-cover", "cover-suluk", "images-stations"] as const;
const IMAGE = /\.(jpe?g|png|webp|svg)$/i;
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

function images(): Plugin {
  const virtual = "virtual:silsila-images";
  const list = (folder: string) =>
    existsSync(resolve(root, folder)) ? readdirSync(resolve(root, folder)).filter((name) => IMAGE.test(name)).sort() : [];
  return {
    name: "silsila-mobile-images",
    resolveId: (id) => (id === virtual ? `\0${virtual}` : null),
    load(id) {
      if (id !== `\0${virtual}`) return null;
      return `export default ${JSON.stringify(Object.fromEntries(IMAGE_FOLDERS.map((folder) => [folder, list(folder)])))};`;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = decodeURIComponent((request.url ?? "").split("?")[0]);
        const folder = IMAGE_FOLDERS.find((name) => path.startsWith(`/${name}/`));
        const file = folder ? resolve(root, folder, path.slice(folder.length + 2)) : resolve(root, "public", path.slice(1));
        if (!IMAGE.test(path) || !file.startsWith(root) || !existsSync(file)) return next();
        response.setHeader("Content-Type", TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
        response.end(readFileSync(file));
      });
    },
    closeBundle() {
      const out = resolve(__dirname, "dist");
      for (const folder of IMAGE_FOLDERS) {
        if (existsSync(resolve(root, folder))) cpSync(resolve(root, folder), join(out, folder), { recursive: true });
      }
      cpSync(resolve(root, "public"), out, { recursive: true });
    },
  };
}

export default defineConfig({
  root: __dirname,
  base: "/",
  plugins: [replaceServerModules(), wrapActions(), images(), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: here("shims/link.tsx") },
      { find: /^next\/image$/, replacement: here("shims/image.tsx") },
      { find: /^next\/navigation$/, replacement: here("shims/navigation.ts") },
      { find: /^next\/headers$/, replacement: here("shims/headers.ts") },
      { find: /^next\/cache$/, replacement: here("shims/cache.ts") },
      { find: /^next$/, replacement: here("shims/next.ts") },
      { find: /^@\//, replacement: `${src("")}/` },
    ],
  },
  publicDir: false,
  // Les composants serveur sont des fonctions async : on garde async/await tels quels pour les reconnaître.
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
  server: { port: 5180, fs: { allow: [root] } },
});
