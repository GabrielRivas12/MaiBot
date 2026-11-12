const config = require("../../../config");

function pickValue(source, keys) {
  if (!source || typeof source !== "object") return null;

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

function valueToString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    return (
      value.romaji ||
      value.english ||
      value.native ||
      value.userPreferred ||
      value.name ||
      null
    );
  }
  return String(value);
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.airings)) return data.airings;
  if (Array.isArray(data?.data?.Page?.airings)) return data.data.Page.airings;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function toDate(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    const milliseconds = value < 1e12 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return toDate(Number(value));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeEntry(entry) {
  const media = entry?.media || entry?.anime || entry;

  const title =
    valueToString(
      pickValue(entry, ["title", "name", "anime", "series", "romaji", "english"])
    ) ||
    valueToString(pickValue(media, ["title", "name", "romaji", "english"])) ||
    "Sin título";

  const episode = pickValue(entry, ["episode", "episodeNumber", "ep"]);
  const when = toDate(
    pickValue(entry, [
      "time",
      "date",
      "airingAt",
      "airDate",
      "airingStart",
      "startTime",
      "timestamp",
    ])
  );

  return { title, episode: episode ?? null, when };
}

async function fetchCalendar() {
  if (!config.animeCalendarUrl) {
    throw new Error(
      "ANIME_CALENDAR_URL no está configurada en el .env."
    );
  }

  const response = await fetch(config.animeCalendarUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`El endpoint respondió con estado ${response.status}.`);
  }

  const data = await response.json();
  return extractList(data).map(normalizeEntry);
}

module.exports = { fetchCalendar };
