const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

const MIN_MESSAGES = 5;
const MAX_MESSAGES = 100;

function buildData(name) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription("Borra mensajes del canal (mínimo 5, máximo 100).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de mensajes a borrar (5-100).")
        .setMinValue(MIN_MESSAGES)
        .setMaxValue(MAX_MESSAGES)
    );
}

async function execute(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Este comando solo funciona dentro de un servidor.",
      ephemeral: true,
    });
    return;
  }

  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)
  ) {
    await interaction.reply({
      content: "Necesitas el permiso **Gestionar mensajes** para usar esto.",
      ephemeral: true,
    });
    return;
  }

  const requiredBotPermissions = [
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ReadMessageHistory,
  ];

  if (!interaction.appPermissions?.has(requiredBotPermissions)) {
    await interaction.reply({
      content:
        "Me faltan permisos: **Gestionar mensajes** y **Leer historial de mensajes**.",
      ephemeral: true,
    });
    return;
  }

  const channel = interaction.channel;

  if (!channel?.messages?.fetch || typeof channel.bulkDelete !== "function") {
    await interaction.reply({
      content: "No puedo borrar mensajes en este tipo de canal.",
      ephemeral: true,
    });
    return;
  }

  const cantidad = interaction.options.getInteger("cantidad") || 10;

  await interaction.deferReply({ ephemeral: true });

  try {
    const fetched = await channel.messages.fetch({ limit: cantidad });
    const deletable = fetched.filter((message) => !message.pinned);

    if (!deletable.size) {
      await interaction.editReply(
        "No hay mensajes que pueda borrar (los fijados se conservan)."
      );
      return;
    }

    const deleted = await channel.bulkDelete(deletable, true);
    const skipped = fetched.size - deleted.size;

    await interaction.editReply(
      `Borré ${deleted.size} mensaje(s).` +
        (skipped > 0
          ? ` Omití ${skipped} (fijados o con más de 14 días).`
          : "")
    );
  } catch (error) {
    console.error("[moderation] Error en /clear:", error);
    await interaction.editReply(`No pude borrar los mensajes: ${error.message}`);
  }
}

module.exports = {
  data: buildData("clear"),
  buildData,
  execute,
};
