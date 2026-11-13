const { EmbedBuilder } = require("discord.js");
const { ScoreDecoder } = require("osu-parsers");
const { getAccessToken } = require("./osu-api.service");
const { buildPreview } = require("./preview.service");

const decoder = new ScoreDecoder();
const LOOKUP_URL = "https://osu.ppy.sh/api/v2/beatmaps/lookup";
const EMBED_COLOR = 0x1db954;

async function extractBeatmapHash(buffer) {
  const score = await decoder.decodeFromBuffer(buffer, false);
  return score?.info?.beatmapHashMD5 || null;
}

async function lookupBeatmap(checksum) {
  const token = await getAccessToken();
  const response = await fetch(
    `${LOOKUP_URL}?checksum=${encodeURIComponent(checksum)}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) {
    throw new Error(`osu! respondió ${response.status} al buscar el mapa.`);
  }

  return response.json();
}

function formatStat(value) {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatBpm(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatSeconds(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildBeatmapEmbed(beatmap) {
  const beatmapset = beatmap?.beatmapset;
  if (!beatmapset) return null;

  const mapUrl = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}#osu/${beatmap.id}`;
  const cover = beatmapset.covers?.cover || beatmapset.covers?.["cover@2x"];
  const stars = Number(beatmap.difficulty_rating || 0).toFixed(2);
  const submitted = beatmapset.submitted_date
    ? new Date(beatmapset.submitted_date).toLocaleDateString("es-ES")
    : "—";

  const description = [
    `🎶 [${beatmap.version}](${mapUrl})`,
    `⭐ ${stars}★`,
    `🎯 AR: ${formatStat(beatmap.ar)} OD: ${formatStat(beatmap.accuracy)} CS: ${formatStat(beatmap.cs)} HP: ${formatStat(beatmap.drain)}`,
    `🎵 BPM: ${formatBpm(beatmap.bpm)}`,
    `🕹️ Duración jugable: ${formatSeconds(beatmap.hit_length)} ⏱️ Total: ${formatSeconds(beatmap.total_length)}`,
    `👤 Mapper: ${beatmapset.creator}`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`${beatmapset.artist} - ${beatmapset.title}`)
    .setURL(mapUrl)
    .setColor(EMBED_COLOR)
    .setDescription(description)
    .setFooter({ text: `Subido el ${submitted}` });

  if (cover) embed.setImage(cover);

  return embed;
}

async function buildReplayBeatmapEmbed(buffer) {
  const checksum = await extractBeatmapHash(buffer);
  if (!checksum) return null;

  const beatmap = await lookupBeatmap(checksum);
  const embed = buildBeatmapEmbed(beatmap);
  if (!embed) return null;

  const preview = await buildPreview(beatmap.beatmapset);

  return { embed, preview };
}

module.exports = {
  buildBeatmapEmbed,
  buildReplayBeatmapEmbed,
  extractBeatmapHash,
  lookupBeatmap,
};
