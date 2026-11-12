const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchCalendar } = require("../services/calendar.service");

const MAX_ENTRIES = 10;

function formatEntry(entry) {
  const episode = entry.episode ? ` · Ep. ${entry.episode}` : "";
  const when = entry.when
    ? ` — <t:${Math.floor(entry.when.getTime() / 1000)}:f>`
    : "";

  return `• **${entry.title}**${episode}${when}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("calendario")
    .setDescription("Muestra el calendario de anime."),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const entries = await fetchCalendar();

      if (!entries.length) {
        await interaction.editReply(
          "El calendario está vacío o el endpoint no devolvió datos reconocibles."
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("Calendario de anime")
        .setColor(0x60a5fa)
        .setDescription(entries.slice(0, MAX_ENTRIES).map(formatEntry).join("\n"))
        .setFooter({
          text: `Mostrando ${Math.min(entries.length, MAX_ENTRIES)} de ${entries.length}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[calendar] Error:", error);
      await interaction.editReply(`No pude cargar el calendario: ${error.message}`);
    }
  },
};
