import { App as CapacitorApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import { servePersonImages } from "./images";
import { navigate } from "./navigation";
import { scheduleReminders } from "./notifications";
import { rememberTheme } from "./theme";
import { PairingScreen, SyncBadge } from "./Pairing";
import { Router } from "./router";
import { initialStatus, pair, parsePairingLink, readPeer, syncNow, useSyncStatus } from "./syncClient";

// L'app iPhone : tant qu'elle n'est pas associée au Mac, l'écran d'association ; ensuite, les pages de l'app,
// synchronisées à l'ouverture, au retour dans l'app et après chaque écriture.
servePersonImages();
rememberTheme();

function App() {
  const status = useSyncStatus();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await initialStatus();
      setReady(true);
      if (await readPeer()) {
        void syncNow();
        scheduleReminders();
      }
    })();
    // Toucher un rappel ouvre Suluk.
    const tapped = LocalNotifications.addListener("localNotificationActionPerformed", () => navigate("/suluk"));
    // Le QR code du Mac ouvre l'app par un lien silsila://pair?…
    const opened = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const peer = parsePairingLink(url);
      if (peer) void pair(peer);
    });
    const resumed = CapacitorApp.addListener("resume", () => {
      void syncNow();
      scheduleReminders();
    });
    return () => {
      void tapped.then((handle) => handle.remove());
      void opened.then((handle) => handle.remove());
      void resumed.then((handle) => handle.remove());
    };
  }, []);

  if (!ready) return null;
  // Tant qu'aucun échange n'a réussi, l'app n'a pas les données du Mac : on reste sur l'écran d'association.
  if (!status.synced) return <PairingScreen />;
  return (
    <>
      <Router />
      <SyncBadge />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
