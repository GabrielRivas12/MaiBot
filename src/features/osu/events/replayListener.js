const { Events, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../../config");
const { parseReplay } = require("../services/replay.service");
const { renderPerformanceChart } = require("../services/chart.service");
const {
  buildBeatmapEmbed,
  lookupBeatmap,
} = require("../services/beatmap-embed.service");
const { buildPreview } = require("../services/preview.service");
const { resolvePp } = require("../services/pp.service");

const MAX_REPLAY_BYTES = 10 * 1024 * 1024;

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor((milliseconds || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (message.author.bot) return;
    if (!config.osuReplayChannelId) return;
    if (message.channelId !== config.osuReplayChannelId) return;

    const attachment = message.attachments.find((item) =>
      item.name?.toLowerCase().endsWith(".osr")
    );

    if (!attachment) return;

    if (attachment.size > MAX_REPLAY_BYTES) {
      await message
        .reply("El archivo .osr es demasiado grande (máximo 10 MB).")
        .catch(() => {});
      return;
    }

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`No pude descargar el replay (${response.status}).`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const replay = await parseReplay(buffer);

      const chartPromise =
        replay.lifeBar.length >= 2
          ? renderPerformanceChart(replay).catch((error) => {
              console.error("[osu] Error generando el gráfico:", error);
              return null;
            })
          : Promise.resolve(null);

      let beatmap = null;
      try {
        if (replay.beatmapHash) {
          beatmap = await lookupBeatmap(replay.beatmapHash);
        }
      } catch (error) {
        console.error("[osu] Error obteniendo el mapa del replay:", error);
      }

      let pp = null;
      if (beatmap) {
        try {
          pp = await resolvePp(beatmap, replay);
        } catch (error) {
          console.warn("[osu] No pude calcular el PP:", error.message);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("Rendimiento del replay")
        .setColor(0xf472b6)
        .addFields(
          { name: "Jugador", value: replay.player, inline: true },
          { name: "Rank", value: String(replay.rank), inline: true },
          { name: "Precisión", value: replay.accuracy, inline: true },
          {
            name: "Score",
            value: replay.score.toLocaleString("es-ES"),
            inline: true,
          },
          { name: "Max combo", value: `${replay.maxCombo}x`, inline: true },
          { name: "Mods", value: replay.mods, inline: true },
          {
            name: "300 / 100 / 50 / Miss",
            value: `${replay.count300} / ${replay.count100} / ${replay.count50} / ${replay.misses}`,
            inline: false,
          },
          { name: "Duración", value: formatDuration(replay.lengthMs), inline: true }
        )
        .setTimestamp();

      if (pp != null) {
        embed.addFields({
          name: "PP",
          value: `${pp.toFixed(2)} pp`,
          inline: true,
        });
      } else {
        embed.addFields({ name: "PP", value: "[-]", inline: true });
      }

      const chart = await chartPromise;

      if (chart) {
        embed
          .setImage("attachment://replay.png")
          .setFooter({ text: "Gráfico de vida (HP)" });

        await message.reply({
          embeds: [embed],
          files: [new AttachmentBuilder(chart, { name: "replay.png" })],
        });
      } else {
        embed.setFooter({ text: "Sin datos de vida para graficar" });
        await message.reply({ embeds: [embed] });
      }

      if (beatmap) {
        try {
          const beatmapEmbed = buildBeatmapEmbed(beatmap);

          if (beatmapEmbed) {
            const payload = { embeds: [beatmapEmbed] };
            const preview = beatmap.beatmapset
              ? await buildPreview(beatmap.beatmapset)
              : null;
            if (preview) payload.files = [preview];
            await message.reply(payload);
          }
        } catch (error) {
          console.error("[osu] Error enviando el mapa del replay:", error);
        }
      }
    } catch (error) {
      console.error("[osu] Error procesando replay:", error);
      await message
        .reply(`No pude procesar el replay: ${error.message}`)
        .catch(() => {});
    }
  },
};
