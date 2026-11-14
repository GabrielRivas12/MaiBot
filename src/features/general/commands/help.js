const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const MAX_FIELDS = 24;

function buildField(command) {
  const json = command.data.toJSON();
  const options = (json.options || []).map(
    (option) =>
      `\`${option.name}\`${option.required ? "*" : ""} — ${
        option.description || "Sin descripción"
      }`
  );

  const value = [json.description || "Sin descripción", ...options]
    .join("\n")
    .slice(0, 1024);

  return { name: `/${json.name}`, value, inline: false };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Muestra la lista de comandos y qué hace cada uno."),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()].sort((a, b) =>
      a.data.name.localeCompare(b.data.name)
    );

    const fields = commands.slice(0, MAX_FIELDS).map(buildField);
    const hidden = commands.length - fields.length;

    if (hidden > 0) {
      fields.push({
        name: `… y ${hidden} comando(s) más`,
        value: "Usa el autocompletado de Discord para verlos todos.",
        inline: false,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Comandos de MaiBot")
      .setColor(0xf472b6)
      .setDescription(
        commands.length
          ? "Estos son los comandos disponibles:"
          : "No hay comandos cargados."
      )
      .addFields(fields)
      .setFooter({ text: `${commands.length} comando(s) · * = obligatorio` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
