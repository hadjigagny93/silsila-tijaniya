// electron-builder ignore les node_modules des ressources : on recopie ceux du serveur.
const { cpSync } = require("node:fs");
const { join } = require("node:path");

exports.default = async ({ appOutDir, packager }) => {
  const app = `${packager.appInfo.productFilename}.app`;
  const target = join(appOutDir, app, "Contents/Resources/app-server/node_modules");
  cpSync(join(packager.projectDir, ".next/standalone/node_modules"), target, {
    recursive: true,
    dereference: true,
  });
};
