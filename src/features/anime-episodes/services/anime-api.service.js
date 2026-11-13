const config = require("../../../config");
const { dateKey, timestampDateKey } = require("./time.service");

const RECENT_PATH =
  "/api/v1/anime/recent-episodes-by-provider?provider=animeav1";
const SCHEDULE_PATH = "/api/v1/anime/schedule";
const SEARCH_PATH = "/api/v1/anime/search";
const INFO_PATH = "/api/v1/anime/info";

function apiBase() {
  if (!config.animeApiUrl) {
    throw new Error("URL_BASE no está configurada en el .env.");
  }

  return config.animeApiUrl.replace(/\/$/, "");
}

function apiHeaders() {
  const headers = { Accept: "application/json" };

  if (config.animeApiKey) headers["x-api-key"] = config.animeApiKey;

  return headers;
}

async function fetchJson(path) {
  const response = await fetch(`${apiBase()}${path}`, {
    headers: apiHeaders(),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`La API respondió ${response.status} en ${path}.`);
  }

  return response.json();
}

function buildCategoryMap(schedule) {
  const map = new Map();

  for (const group of schedule?.data?.groups || []) {
    for (const episode of group.episodes || []) {
      if (episode.slug && episode.category) {
        map.set(episode.slug, episode.category);
      }
    }
  }

  return map;
}

function slugFromUrl(url) {
  if (!url) return null;

  const match = String(url).match(/\/media\/([^/]+)/);
  return match ? match[1] : null;
}

function normalizeEpisode(raw, categories) {
  const slug = raw.slug || slugFromUrl(raw.url);
  const episode = Number(raw.episode);

  if (!slug || !Number.isFinite(episode)) return null;

  return {
    slug,
    title: raw.title || "Sin título",
    episode,
    image: raw.image || null,
    timestamp: raw.timestamp || null,
    dateLabel: raw.dateLabel || null,
    category: categories.get(slug) || "Anime",
    provider: raw.provider || "AnimeAV1",
    sourceUrl: raw.url || null,
  };
}

function normalizeSearchResult(raw) {
  const source = String(raw.slug || raw.url || "");
  const slug =
    slugFromUrl(source) ||
    (raw.slug && !source.includes("/") ? String(raw.slug) : null);

  if (!slug || !raw.title) return null;

  return {
    id: raw.id ?? null,
    title: raw.title,
    slug,
    url: raw.url || raw.slug || null,
    image: raw.image || null,
    type: raw.type || null,
    provider: raw.provider || "AnimeAV1",
  };
}

function isToday(episode, todayKey) {
  if (episode.timestamp) {
    return timestampDateKey(episode.timestamp) === todayKey;
  }

  return episode.dateLabel === "Hoy";
}

async function fetchRecentEpisodes() {
  const [recent, schedule] = await Promise.all([
    fetchJson(RECENT_PATH),
    fetchJson(SCHEDULE_PATH).catch((error) => {
      console.warn("[anime] No pude cargar /schedule:", error.message);
      return null;
    }),
  ]);

  const categories = buildCategoryMap(schedule);
  const results = recent?.data?.results || [];

  return results
    .map((raw) => normalizeEpisode(raw, categories))
    .filter(Boolean);
}

async function fetchSchedule() {
  return fetchJson(SCHEDULE_PATH);
}

async function searchAnime(query) {
  const path = `${SEARCH_PATH}?q=${encodeURIComponent(query)}&domain=animeav1`;
  const payload = await fetchJson(path);
  const results = payload?.data?.results || [];

  return results.map(normalizeSearchResult).filter(Boolean);
}

async function fetchAnimeInfo(slugOrUrl) {
  const path = `${INFO_PATH}?url=${encodeURIComponent(slugOrUrl)}`;
  const payload = await fetchJson(path);

  return payload?.data || null;
}

async function fetchTodayEpisodes() {
  const todayKey = dateKey();
  const episodes = await fetchRecentEpisodes();
  const seen = new Set();

  const todayEpisodes = episodes.filter((episode) => {
    if (!isToday(episode, todayKey)) return false;

    const key = `${episode.slug}:${episode.episode}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  return { todayKey, episodes: todayEpisodes };
}

module.exports = {
  fetchAnimeInfo,
  fetchRecentEpisodes,
  fetchSchedule,
  fetchTodayEpisodes,
  isToday,
  searchAnime,
  slugFromUrl,
};
