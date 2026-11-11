// Complète le serveur autonome de Next.js : il n'embarque ni les fichiers
// statiques ni le dossier public, et ne doit garder aucun fichier .env local.
import { cpSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const standalone = ".next/standalone";

cpSync(".next/static", join(standalone, ".next/static"), { recursive: true });
cpSync("public", join(standalone, "public"), { recursive: true });
cpSync("images-cover", join(standalone, "public", "images-cover"), { recursive: true });
cpSync("cover-suluk", join(standalone, "public", "cover-suluk"), { recursive: true });
cpSync("images-stations", join(standalone, "public", "images-stations"), { recursive: true });

for (const name of readdirSync(standalone)) {
  if (name.startsWith(".env")) rmSync(join(standalone, name));
}
rmSync(join(standalone, "data"), { recursive: true, force: true });
