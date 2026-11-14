const RANK_LABELS = {
  XH: "SS",
  X: "SS",
  SH: "S",
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  F: "F",
};

function formatMods(mods) {
  if (!Array.isArray(mods) || !mods.length) return "NM";
  return `+${mods.join("")}`;
}

function formatAccuracy(accuracy) {
  if (!Number.isFinite(accuracy)) return "—";
  return `${(accuracy * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("es-ES");
}

function formatDateTime(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
}

function formatRank(rank) {
  return RANK_LABELS[rank] || rank || "—";
}

function formatPp(pp) {
  return Number.isFinite(pp) ? `${pp.toFixed(2)} pp` : "[-]";
}

function beatmapLabel(score) {
  const set = score.beatmapset || {};
  const map = score.beatmap || {};
  const artist = set.artist || "Artista desconocido";
  const title = set.title || "Mapa desconocido";
  const version = map.version ? ` [${map.version}]` : "";
  return `${artist} - ${title}${version}`;
}

function beatmapUrl(score) {
  return score.beatmap?.url || null;
}

module.exports = {
  beatmapLabel,
  beatmapUrl,
  formatAccuracy,
  formatDateTime,
  formatMods,
  formatNumber,
  formatPp,
  formatRank,
};
