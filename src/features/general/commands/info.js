const { SlashCommandBuilder, EmbedBuilder, version } = require("discord.js");

function formatUptime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const chunks = [];
  if (days) chunks.push(`${days}d`);
  if (hours) chunks.push(`${hours}h`);
  if (minutes) chunks.push(`${minutes}m`);
  chunks.push(`${rest}s`);

  return chunks.join(" ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Muestra información del bot."),

  async execute(interaction) {
    const client = interaction.client;

    const embed = new EmbedBuilder()
      .setTitle("MaiBot")
      .setColor(0xf472b6)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Usuario", value: client.user.tag, inline: true },
        { name: "Ping", value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: "Uptime", value: formatUptime(client.uptime / 1000), inline: true },
        { name: "Servidores", value: `${client.guilds.cache.size}`, inline: true },
        { name: "discord.js", value: version, inline: true },
        { name: "Node.js", value: process.version, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
