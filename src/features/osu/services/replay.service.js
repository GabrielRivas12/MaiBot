const { ScoreDecoder } = require("osu-parsers");

const decoder = new ScoreDecoder();

const MODS = [
  [1 << 0, "NF"],
  [1 << 1, "EZ"],
  [1 << 2, "TD"],
  [1 << 3, "HD"],
  [1 << 4, "HR"],
  [1 << 5, "SD"],
  [1 << 6, "DT"],
  [1 << 7, "RX"],
  [1 << 8, "HT"],
  [1 << 9, "NC"],
  [1 << 10, "FL"],
  [1 << 11, "AT"],
  [1 << 12, "SO"],
  [1 << 13, "AP"],
  [1 << 14, "PF"],
  [1 << 15, "4K"],
  [1 << 16, "5K"],
  [1 << 17, "6K"],
  [1 << 18, "7K"],
  [1 << 19, "8K"],
  [1 << 20, "FI"],
  [1 << 21, "RD"],
  [1 << 22, "CN"],
  [1 << 23, "TP"],
  [1 << 24, "9K"],
  [1 << 25, "CO"],
  [1 << 26, "1K"],
  [1 << 27, "3K"],
  [1 << 28, "2K"],
];

function formatMods(rawMods) {
  if (typeof rawMods === "string" && rawMods.trim()) return rawMods.trim();
  if (typeof rawMods !== "number" || rawMods === 0) return "NM";

  const active = MODS.filter(([bit]) => (rawMods & bit) !== 0).map(
    ([, name]) => name
  );

  return active.length ? active.join("") : "NM";
}

function formatAccuracy(accuracy) {
  if (typeof accuracy !== "number" || Number.isNaN(accuracy)) return "N/A";
  const percent = accuracy <= 1 ? accuracy * 100 : accuracy;
  return `${percent.toFixed(2)}%`;
}

const RANK_LABELS = {
  X: "SS",
  XH: "SS",
  S: "S",
  SH: "S",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  F: "F",
};

async function parseReplay(buffer) {
  const score = await decoder.decodeFromBuffer(buffer, true);
  const info = score.info;
  const replay = score.replay;

  if (!replay) {
    throw new Error("El archivo no contiene datos de replay.");
  }

  const lifeBar = (replay.lifeBar || [])
    .filter(
      (frame) =>
        Number.isFinite(frame.startTime) && Number.isFinite(frame.health)
    )
    .map((frame) => ({
      time: frame.startTime,
      health: Math.max(0, Math.min(1, frame.health)),
    }));

  info.passed = true;

  const lastLifeTime = lifeBar.length ? lifeBar[lifeBar.length - 1].time : 0;

  return {
    player: info.username || "Desconocido",
    rank: RANK_LABELS[info.rank] || info.rank,
    score: info.totalScore || 0,
    accuracy: formatAccuracy(info.accuracy),
    maxCombo: info.maxCombo || 0,
    mods: formatMods(info.rawMods),
    count300: info.count300 ?? 0,
    count100: info.count100 ?? 0,
    count50: info.count50 ?? 0,
    misses: info.countMiss ?? 0,
    lengthMs: replay.length || lastLifeTime,
    lifeBar,
  };
}

module.exports = { parseReplay };
