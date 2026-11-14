const { getAccessToken, resolveUserId } = require("./osu-api.service");

const OSU_API_URL = "https://osu.ppy.sh/api/v2";
const OSU_MODE = "osu";

const LEGACY_MODS = new Set([
  "NF",
  "EZ",
  "TD",
  "HD",
  "HR",
  "SD",
  "DT",
  "RX",
  "HT",
  "FL",
  "AT",
  "SO",
  "AP",
  "PF",
]);

function normalizeMods(mods) {
  const value = Array.isArray(mods) ? mods.join("") : String(mods || "");
  const acronyms = value.toUpperCase().match(/../g) || [];

  if (!acronyms.length) return "NM";

  const normalized = acronyms.map((acronym) =>
    acronym === "NC" ? "DT" : acronym
  );

  return [...new Set(normalized)].sort().join("");
}

function legacyEquivalentMods(mods) {
  const acronyms = (normalizeMods(mods).match(/../g) || []).filter((acronym) =>
    LEGACY_MODS.has(acronym)
  );

  return acronyms.sort().join("") || "NM";
}

function scoreMatchesReplay(apiScore, replay) {
  if (!apiScore) return false;

  const stats = apiScore.statistics || {};
  const sameJudgements =
    Number(apiScore.max_combo) === replay.maxCombo &&
    Number(stats.count_300 ?? 0) === replay.count300 &&
    Number(stats.count_100 ?? 0) === replay.count100 &&
    Number(stats.count_50 ?? 0) === replay.count50 &&
    Number(stats.count_miss ?? 0) === replay.misses;

  if (!sameJudgements) return false;

  if (replay.isLazer) {
    return legacyEquivalentMods(apiScore.mods) === normalizeMods(replay.mods);
  }

  return (
    Number(apiScore.score) === replay.score &&
    normalizeMods(apiScore.mods) === normalizeMods(replay.mods)
  );
}

async function fetchOfficialPp(beatmap, replay) {
  const userId = await resolveUserId(replay.player || replay.userId, OSU_MODE);
  if (!userId) return null;

  const token = await getAccessToken();
  const params = new URLSearchParams({ mode: OSU_MODE });
  const mods = normalizeMods(replay.mods);

  if (mods !== "NM" && !replay.isLazer) {
    for (const acronym of mods.match(/../g) || []) {
      params.append("mods[]", acronym);
    }
  }

  const response = await fetch(
    `${OSU_API_URL}/beatmaps/${beatmap.id}/scores/users/${userId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) return null;

  const payload = await response.json();
  const apiScore = payload.score || payload;

  if (!Number.isFinite(apiScore?.pp) || !scoreMatchesReplay(apiScore, replay)) {
    return null;
  }

  return apiScore.pp;
}

async function resolvePp(beatmap, replay) {
  if (!beatmap || beatmap.mode !== OSU_MODE || !replay) return null;

  return fetchOfficialPp(beatmap, replay).catch((error) => {
    console.warn("[osu] No pude obtener el PP oficial:", error.message);
    return null;
  });
}

module.exports = { resolvePp };
