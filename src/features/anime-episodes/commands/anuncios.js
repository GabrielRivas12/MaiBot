const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { runManual, formatPreview } = require("../services/announce.service");
const { getGuildConfig } = require("../services/state.service");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anuncios")
    .setDescription("Previsualiza o envía los episodios de anime de hoy.")
    .addStringOption((option) =>
      option
        .setName("modo")
        .setDescription("Preview no publica; enviar publica en el canal configurado.")
        .addChoices(
          { name: "Preview", value: "preview" },
          { name: "Enviar", value: "enviar" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("forzar")
        .setDescription("Ignora los episodios ya enviados hoy.")
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Este comando solo funciona dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    const modo = interaction.options.getString("modo") || "preview";
    const force = interaction.options.getBoolean("forzar") || false;

    if (
      modo === "enviar" &&
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: "Solo administradores pueden enviar anuncios.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: modo === "preview" });

    try {
      if (modo === "preview") {
        const result = await runManual(interaction.client, interaction.guildId, {
          force,
          dryRun: true,
        });

        const embed = new EmbedBuilder()
          .setTitle("Preview de episodios de hoy")
          .setColor(0x60a5fa)
          .setDescription(formatPreview(result.pending))
          .setFooter({
            text: `${result.pending.length} episodio(s) pendiente(s)`,
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const settings = await getGuildConfig(interaction.guildId);

      if (!settings?.enabled || !settings.channelId) {
        await interaction.editReply(
          "Los anuncios no están activos. Usa `/calendario activar` primero."
        );
        return;
      }

      const result = await runManual(interaction.client, interaction.guildId, {
        force,
      });

      await interaction.editReply(
        result.sent
          ? `Enviados ${result.sent} episodio(s) a <#${settings.channelId}>.`
          : "No hay episodios nuevos para enviar."
      );
    } catch (error) {
      console.error("[anime] Error en /anuncios:", error);
      await interaction.editReply(
        `No pude procesar los anuncios: ${error.message}`
      );
    }
  },
};
