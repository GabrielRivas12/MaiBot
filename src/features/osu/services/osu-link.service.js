const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "../../../../data");
const LINKS_FILE = path.join(DATA_DIR, "osu-links.json");

async function readLinks() {
  try {
    const raw = await fs.readFile(LINKS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return {};
    console.error("[osu] No pude leer osu-links.json:", error);
    return {};
  }
}

async function writeLinks(links) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${LINKS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(links, null, 2), "utf8");
  await fs.rename(tempFile, LINKS_FILE);
}

async function getLink(discordId) {
  if (!discordId) return null;
  const links = await readLinks();
  return links[discordId] || null;
}

async function saveLink(discordId, { osuUserId, osuUsername }) {
  if (!discordId) throw new Error("Falta el ID de Discord.");

  const links = await readLinks();
  links[discordId] = {
    osuUserId,
    osuUsername,
    updatedAt: new Date().toISOString(),
  };

  await writeLinks(links);
  return links[discordId];
}

module.exports = { getLink, saveLink };
