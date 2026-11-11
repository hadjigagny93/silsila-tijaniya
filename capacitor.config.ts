import type { CapacitorConfig } from "@capacitor/cli";

// L'app iPhone : les pages de src/ construites par mobile/vite.config.ts, dans un projet iOS natif (mobile/ios).
const config: CapacitorConfig = {
  appId: "org.silsila.tijaniya",
  appName: "Silsila",
  webDir: "mobile/dist",
  ios: {
    path: "mobile/ios",
    contentInset: "never",
  },
  plugins: {
    // Les échanges avec le Mac passent par le réseau natif d'iOS (HTTP sur le Wi-Fi, sans CORS).
    CapacitorHttp: { enabled: true },
    CapacitorSQLite: { iosDatabaseLocation: "Library/CapacitorDatabase" },
  },
};

export default config;
