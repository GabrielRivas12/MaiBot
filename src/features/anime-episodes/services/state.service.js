const fs = require("node:fs/promises");
const path = require("node:path");

const DATA_DIR = path.resolve(__dirname, "../../../../data");
const CONFIG_FILE = path.join(DATA_DIR, "anime-announcements.json");
const SENT_FILE = path.join(DATA_DIR, "anime-sent.json");

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    console.error(`[anime] No pude leer ${path.basename(file)}:`, error);
    return fallback;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${file}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempFile, file);
}

async function getGuildConfig(guildId) {
  const configs = await readJson(CONFIG_FILE, {});
  return configs[guildId] || null;
}

async function setGuildConfig(guildId, patch) {
  const configs = await readJson(CONFIG_FILE, {});
  const current = configs[guildId] || { enabled: false, channelId: null };

  configs[guildId] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeJson(CONFIG_FILE, configs);
  return configs[guildId];
}

async function getEnabledGuilds() {
  const configs = await readJson(CONFIG_FILE, {});

  return Object.entries(configs)
    .filter(([, settings]) => settings?.enabled && settings?.channelId)
    .map(([guildId, settings]) => ({ guildId, ...settings }));
}

async function getSentKeys(guildId, date) {
  const state = await readJson(SENT_FILE, {});
  const entry = state[guildId];

  if (!entry || entry.date !== date) return new Set();
  return new Set(entry.keys || []);
}

async function markSent(guildId, date, keys) {
  const state = await readJson(SENT_FILE, {});
  const entry = state[guildId];
  const nextKeys = new Set(entry && entry.date === date ? entry.keys : []);

  for (const key of keys) nextKeys.add(key);

  state[guildId] = { date, keys: [...nextKeys] };
  await writeJson(SENT_FILE, state);

  return state[guildId];
}

module.exports = {
  getEnabledGuilds,
  getGuildConfig,
  getSentKeys,
  markSent,
  setGuildConfig,
};
