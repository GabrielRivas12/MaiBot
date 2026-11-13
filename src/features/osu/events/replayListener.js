const { Events, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../../config");
const { parseReplay } = require("../services/replay.service");
const { renderPerformanceChart } = require("../services/chart.service");

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
      const chart = await renderPerformanceChart(replay);

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
        .setImage("attachment://replay.png")
        .setFooter({ text: "Gráfico de vida (HP)"})
        .setTimestamp();

      await message.reply({
        embeds: [embed],
        files: [new AttachmentBuilder(chart, { name: "replay.png" })],
      });
    } catch (error) {
      console.error("[osu] Error procesando replay:", error);
      await message
        .reply(`No pude procesar el replay: ${error.message}`)
        .catch(() => {});
    }
  },
};
