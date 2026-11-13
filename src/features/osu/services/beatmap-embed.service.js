const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { ScoreDecoder } = require("osu-parsers");
const { getAccessToken } = require("./osu-api.service");
const { renderBeatmapChart } = require("./beatmap-chart.service");

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

function buildBeatmapEmbed(beatmap) {
  const beatmapset = beatmap?.beatmapset;
  if (!beatmapset) return null;

  const mapUrl = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}#osu/${beatmap.id}`;
  const cover = beatmapset.covers?.cover || beatmapset.covers?.["cover@2x"];
  const stars = Number(beatmap.difficulty_rating || 0).toFixed(2);

  const embed = new EmbedBuilder()
    .setTitle(`${beatmapset.artist} - ${beatmapset.title}`)
    .setURL(mapUrl)
    .setColor(EMBED_COLOR)
    .setDescription(`🎶 Dificultad jugada: **${beatmap.version}** · ⭐ **${stars}★**`)
    .setFooter({ text: `Mapa del replay · ${beatmapset.creator} · osu!` });

  if (cover) embed.setThumbnail(cover);

  return embed;
}

async function buildReplayBeatmapEmbed(buffer) {
  const checksum = await extractBeatmapHash(buffer);
  if (!checksum) return null;

  const beatmap = await lookupBeatmap(checksum);
  const chart = await renderBeatmapChart(beatmap);
  const embed = buildBeatmapEmbed(beatmap);
  if (!embed) return null;

  if (!chart) return { embed, file: null };

  embed.setImage("attachment://beatmap-success.png");

  return {
    embed,
    file: new AttachmentBuilder(chart, { name: "beatmap-success.png" }),
  };
}

module.exports = {
  buildBeatmapEmbed,
  buildReplayBeatmapEmbed,
  extractBeatmapHash,
  lookupBeatmap,
};
