const fs = require("node:fs");
const path = require("node:path");

const FEATURES_DIR = path.join(__dirname, "..", "features");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadEvents(client) {
  for (const file of walk(FEATURES_DIR)) {
    const parts = file.split(path.sep);
    if (!parts.includes("events")) continue;

    const event = require(file);
    if (!event || !event.name || typeof event.execute !== "function") {
      console.warn(
        `[events] Ignorado ${path.relative(FEATURES_DIR, file)}: falta name o execute.`
      );
      continue;
    }

    const handler = (...args) => {
      Promise.resolve(event.execute(...args)).catch((error) => {
        console.error(`[events] Error en ${event.name}:`, error);
      });
    };

    if (event.once) {
      client.once(event.name, handler);
    } else {
      client.on(event.name, handler);
    }

    console.log(`[events] Cargado ${event.name}`);
  }
}

module.exports = { loadEvents };
