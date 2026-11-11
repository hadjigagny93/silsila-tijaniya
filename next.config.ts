import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur autonome : c'est lui que l'application de bureau embarque.
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
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
