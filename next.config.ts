import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur autonome : c'est lui que l'application de bureau embarque.
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // La photo et l'image du lieu partent dans le même formulaire : au-delà du 1 Mo par défaut.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
