const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const { searchBeatmapsets } = require("../services/osu-api.service");
const { buildPreview } = require("../services/preview.service");

const EMBED_COLOR = 0x1db954;
const MAX_DIFFICULTIES = 10;

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function capitalize(value) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function osuBeatmaps(beatmapset) {
  return (beatmapset.beatmaps || [])
    .filter((beatmap) => beatmap.mode === "osu" && !beatmap.convert)
    .sort((a, b) => (a.difficulty_rating || 0) - (b.difficulty_rating || 0));
}

function difficultyLine(beatmap) {
  const stars = Number(beatmap.difficulty_rating || 0).toFixed(2);

  return (
    `[${beatmap.version}](${beatmap.url}) · ⭐ ${stars}★` +
    ` · AR ${beatmap.ar} · OD ${beatmap.accuracy} · CS ${beatmap.cs} · HP ${beatmap.drain}` +
    ` · ${formatDuration(beatmap.hit_length)}`
  );
}

function buildEmbed(beatmapset) {
  const difficulties = osuBeatmaps(beatmapset);
  const shown = difficulties.slice(0, MAX_DIFFICULTIES);
  const lines = shown.map(difficultyLine);

  if (difficulties.length > shown.length) {
    lines.push(`… y ${difficulties.length - shown.length} dificultad(es) más.`);
  }

  const plays = beatmapset.play_count?.toLocaleString("es-ES") || "—";
  const favourites =
    beatmapset.favourite_count?.toLocaleString("es-ES") || "—";

  const embed = new EmbedBuilder()
    .setTitle(`${beatmapset.artist} - ${beatmapset.title}`)
    .setURL(`https://osu.ppy.sh/beatmapsets/${beatmapset.id}`)
    .setColor(EMBED_COLOR)
    .setDescription(
      `👤 **Mapper:** ${beatmapset.creator}\n` +
        `🎚️ **Estado:** ${capitalize(beatmapset.status)}\n` +
        `🎵 **BPM:** ${beatmapset.bpm}\n` +
        `▶️ **Reproducciones:** ${plays} · ❤️ **Favoritos:** ${favourites}`
    )
    .addFields({
      name: "Dificultades",
      value: lines.length ? lines.join("\n") : "—",
      inline: false,
    });

  const cover = beatmapset.covers?.cover || beatmapset.covers?.["cover@2x"];
  if (cover) embed.setImage(cover);

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("btm")
    .setDescription("Busca un beatmap de osu! por nombre.")
    .addStringOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de la canción, artista o mapa.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("pagina")
        .setDescription("Resultado a mostrar (1 = mejor coincidencia).")
        .setMinValue(1)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("nombre");
    const page = interaction.options.getInteger("pagina") || 1;

    await interaction.deferReply();

    try {
      const { beatmapsets, total } = await searchBeatmapsets(query);

      if (!beatmapsets.length) {
        await interaction.editReply(`No encontré beatmaps para «${query}».`);
        return;
      }

      const index = Math.min(Math.max(page - 1, 0), beatmapsets.length - 1);
      const beatmapset = beatmapsets[index];

      const embed = buildEmbed(beatmapset).setFooter({
        text: `Resultado ${index + 1} de ${total} · Subido el ${new Date(
          beatmapset.submitted_date
        ).toLocaleDateString("es-ES")} · osu!`,
      });

      const preview = await buildPreview(beatmapset);
      const payload = { embeds: [embed] };
      if (preview) payload.files = [preview];

      await interaction.editReply(payload);
    } catch (error) {
      console.error("[osu] Error en /btm:", error);
      await interaction.editReply(
        `No pude buscar el beatmap: ${error.message}`
      );
    }
  },
};
