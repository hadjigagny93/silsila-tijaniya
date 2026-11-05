const { app, BrowserWindow, Menu, dialog, shell, utilityProcess } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const BACKUPS_KEPT = 30;
// Port de synchronisation avec l'iPhone, sur le réseau local (le même que src/lib/pairing.ts).
const SYNC_PORT = 47300;

const dataDir = () => app.getPath("userData");
const databasePath = () => path.join(dataDir(), "silsila.db");
const backupsDir = () => path.join(dataDir(), "sauvegardes");
// Une nouvelle version déposée ici remplace l'application quand on la quitte : rien n'est fermé de force.
const updateDir = () => path.join(dataDir(), "mise-a-jour");
const stagedApp = () => path.join(updateDir(), "Silsila Tijaniya.app");
const previousApp = () => path.join(updateDir(), "ancienne-version.app");

let server = null;
let syncServer = null;
let mainWindow = null;
let origin = "";
let relaunchAfterUpdate = false;

function hasUpdate() {
  return app.isPackaged && fs.existsSync(path.join(stagedApp(), "Contents", "Info.plist"));
}

// Le dossier .app qui contient l'exécutable : …/Silsila Tijaniya.app/Contents/MacOS/Silsila Tijaniya.
function bundlePath() {
  return path.resolve(process.execPath, "..", "..", "..");
}

// Un petit script détaché attend la fin de l'application, puis échange les deux versions.
// En cas d'échec, l'ancienne version est remise en place.
function applyUpdateOnExit() {
  const bundle = bundlePath();
  if (!hasUpdate() || !bundle.endsWith(".app")) return;
  const script = [
    `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
    'rm -rf "$3"',
    'mv "$1" "$3" || exit 1',
    'if mv "$2" "$1"; then rm -rf "$3"; else mv "$3" "$1"; fi',
    relaunchAfterUpdate ? 'open "$1"' : "",
  ]
    .filter(Boolean)
    .join("; ");
  spawn("/bin/sh", ["-c", script, "mise-a-jour", bundle, stagedApp(), previousApp()], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

function backUpDatabase() {
  if (!fs.existsSync(databasePath())) return;
  fs.mkdirSync(backupsDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(databasePath(), path.join(backupsDir(), `silsila-${stamp}.db`));

  // Les noms sont horodatés : le tri alphabétique est aussi chronologique.
  const backups = fs.readdirSync(backupsDir()).filter((name) => name.endsWith(".db")).sort();
  for (const name of backups.slice(0, -BACKUPS_KEPT)) fs.rmSync(path.join(backupsDir(), name));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function isReady(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
  });
}

async function startServer() {
  const serverDir = app.isPackaged
    ? path.join(process.resourcesPath, "app-server")
    : path.join(__dirname, "..", ".next", "standalone");
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;

  let failure = "";
  server = utilityProcess.fork(path.join(serverDir, "server.js"), [], {
    cwd: serverDir,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      // Le serveur n'écoute que sur cette machine : rien n'est exposé au réseau.
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      SQLITE_PATH: databasePath(),
      SILSILA_LAN_HOST: localHostName(),
    },
  });
  server.stderr?.on("data", (chunk) => (failure += chunk));

  let exited = false;
  server.once("exit", () => (exited = true));

  for (let attempt = 0; attempt < 150 && !exited; attempt++) {
    if (await isReady(origin)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(failure || "Le serveur interne n'a pas démarré.");
}

// Nom Bonjour du Mac (« MacBook-de-Seun »), par lequel l'iPhone le retrouve sur le Wi-Fi.
function localHostName() {
  try {
    return require("node:child_process").execFileSync("scutil", ["--get", "LocalHostName"]).toString().trim();
  } catch {
    return require("node:os").hostname();
  }
}

// La seule porte ouverte sur le réseau local : la synchronisation avec l'iPhone appairé.
// Tout le reste du serveur interne reste réservé à cette machine. Le jeton est vérifié par /api/sync.
function startSyncServer() {
  syncServer = http.createServer((request, response) => {
    const { pathname } = new URL(request.url, "http://local");
    // L'app de l'iPhone passe par le réseau natif ; ces en-têtes servent à l'essayer dans un navigateur.
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === "GET" && pathname === "/ping") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ app: "silsila" }));
      return;
    }
    if (request.method !== "POST" || pathname !== "/api/sync") {
      response.writeHead(404);
      response.end();
      return;
    }
    const forward = http.request(
      `${origin}/api/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: request.headers.authorization ?? "",
        },
      },
      (answer) => {
        response.writeHead(answer.statusCode ?? 502, { "Content-Type": "application/json" });
        answer.pipe(response);
      },
    );
    forward.on("error", () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(forward);
  });
  // Si le port est pris, l'app marche quand même : seule la synchronisation est indisponible.
  syncServer.on("error", (error) => console.error("Synchronisation indisponible :", error.message));
  syncServer.listen(SYNC_PORT, "0.0.0.0");
}

function openPairing() {
  const pairing = new BrowserWindow({
    width: 760,
    height: 720,
    title: "Associer un iPhone",
    backgroundColor: "#ffffff",
    parent: mainWindow ?? undefined,
  });
  pairing.loadURL(`${origin}/appairage`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Silsila Tijaniya",
    backgroundColor: "#ffffff",
  });

  // L'application reste sur son serveur local ; le reste s'ouvre dans le navigateur.
  const openOutside = (url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  };
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(origin)) return;
    event.preventDefault();
    openOutside(url);
  });

  mainWindow.on("closed", () => (mainWindow = null));
  mainWindow.loadURL(`${origin}/silsila`);
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          {
            label: hasUpdate() ? "Redémarrer pour installer la nouvelle version" : "Aucune nouvelle version",
            enabled: hasUpdate(),
            click: () => {
              relaunchAfterUpdate = true;
              app.quit();
            },
          },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      {
        label: "Données",
        submenu: [
          { label: "Associer un iPhone…", enabled: Boolean(origin), click: openPairing },
          { type: "separator" },
          { label: "Afficher ma base de données", click: () => shell.showItemInFolder(databasePath()) },
          {
            label: "Afficher les sauvegardes",
            click: () => {
              fs.mkdirSync(backupsDir(), { recursive: true });
              shell.openPath(backupsDir());
            },
          },
        ],
      },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    buildMenu();
    try {
      // Avant le démarrage du serveur : le fichier n'est pas en cours d'écriture.
      backUpDatabase();
      await startServer();
      startSyncServer();
      buildMenu();
      createWindow();
    } catch (error) {
      dialog.showErrorBox("Silsila Tijaniya n'a pas pu démarrer", String(error?.message ?? error));
      app.quit();
    }
  });

  // Une nouvelle version a pu être déposée pendant que l'application tourne.
  app.on("browser-window-focus", buildMenu);

  app.on("activate", () => {
    if (origin && !mainWindow) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    syncServer?.close();
    server?.kill();
  });
  app.on("will-quit", applyUpdateOnExit);
}
