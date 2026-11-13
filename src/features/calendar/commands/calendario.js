const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const {
  fetchSchedule,
} = require("../../anime-episodes/services/anime-api.service");
const {
  clockTime,
  longDate,
  weekdayNumber,
} = require("../../anime-episodes/services/time.service");
const {
  imageUrl,
  itadakimasuUrl,
} = require("../../anime-episodes/services/announce.service");
const {
  getGuildConfig,
  setGuildConfig,
} = require("../../anime-episodes/services/state.service");
const {
  upcomingRuns,
} = require("../../anime-episodes/services/scheduler.service");

const MAX_EMBEDS_PER_MESSAGE = 10;

function chunk(list, size) {
  const chunks = [];

  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }

  return chunks;
}

function botName(interaction) {
  return interaction.client?.user?.username || "MaiBot";
}

function buildCalendarEmbed(episode, interaction) {
  const url = itadakimasuUrl(episode);
  const embed = new EmbedBuilder()
    .setTitle(episode.title)
    .setURL(url)
    .setColor(0x60a5fa)
    .setDescription(`[Ver en Itadakimasu](${url})`)
    .addFields(
      {
        name: "Hora",
        value: clockTime(episode.publishedAt) || episode.time || "—",
        inline: true,
      },
      {
        name: "Episodio",
        value: episode.episode != null ? String(episode.episode) : "—",
        inline: true,
      },
      {
        name: "Categoría",
        value: episode.category || "Anime",
        inline: true,
      }
    )
    .setFooter({ text: `Calendario · ${longDate()} | ${botName(interaction)}` });

  const cover = imageUrl(episode);
  if (cover) embed.setThumbnail(cover);

  return embed;
}

async function showCalendar(interaction) {
  await interaction.deferReply();

  try {
    const schedule = await fetchSchedule();
    const groups = schedule?.data?.groups || [];
    const todayDay = weekdayNumber();

    const episodes = groups
      .flatMap((group) =>
        (group.episodes || []).map((episode) => ({
          ...episode,
          groupDay: group.day,
        }))
      )
      .filter((episode) => {
        const day = episode.publishedAt
          ? weekdayNumber(new Date(episode.publishedAt))
          : episode.groupDay;

        return day === todayDay;
      })
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    if (!episodes.length) {
      await interaction.editReply(
        "No hay episodios programados para hoy en el calendario de AnimeAV1."
      );
      return;
    }

    const embeds = episodes.map((episode) =>
      buildCalendarEmbed(episode, interaction)
    );
    const batches = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);

    await interaction.editReply({ embeds: batches[0] });

    for (const batch of batches.slice(1)) {
      await interaction.followUp({ embeds: batch });
    }
  } catch (error) {
    console.error("[calendar] Error:", error);
    await interaction.editReply(`No pude cargar el calendario: ${error.message}`);
  }
}

function isAdmin(interaction) {
  return interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator
  );
}

function formatNextRuns(count = 2) {
  const runs = upcomingRuns(count);

  if (!runs.length) return "Sin programación activa.";

  return runs
    .map((date) => `<t:${Math.floor(date.getTime() / 1000)}:f>`)
    .join(" · ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("calendario")
    .setDescription("Muestra el calendario de anime o configura los anuncios.")
    .addStringOption((option) =>
      option
        .setName("accion")
        .setDescription("Acción a realizar.")
        .addChoices(
          { name: "Ver calendario", value: "ver" },
          { name: "Estado de anuncios", value: "estado" },
          { name: "Activar anuncios", value: "activar" },
          { name: "Desactivar anuncios", value: "desactivar" },
          { name: "Cambiar canal", value: "canal" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal destino para los anuncios.")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
    ),

  async execute(interaction) {
    const action = interaction.options.getString("accion") || "ver";

    if (action === "ver") {
      await showCalendar(interaction);
      return;
    }

    if (!interaction.guildId) {
      await interaction.reply({
        content: "Este comando solo funciona dentro de un servidor.",
        ephemeral: true,
      });
      return;
    }

    if (!isAdmin(interaction)) {
      await interaction.reply({
        content: "Solo administradores pueden configurar los anuncios.",
        ephemeral: true,
      });
      return;
    }

    const selectedChannel = interaction.options.getChannel("canal");
    const settings = await getGuildConfig(interaction.guildId);

    if (action === "activar") {
      const channelId = selectedChannel?.id || interaction.channelId;
      const updated = await setGuildConfig(interaction.guildId, {
        enabled: true,
        channelId,
      });

      await interaction.reply({
        content: `Anuncios activados en <#${updated.channelId}>. Próximos: ${formatNextRuns()}`,
        ephemeral: true,
      });
      return;
    }

    if (action === "desactivar") {
      await setGuildConfig(interaction.guildId, { enabled: false });

      await interaction.reply({
        content: "Anuncios desactivados.",
        ephemeral: true,
      });
      return;
    }

    if (action === "canal") {
      if (!selectedChannel) {
        await interaction.reply({
          content: "Indica el canal con la opción `canal`.",
          ephemeral: true,
        });
        return;
      }

      const updated = await setGuildConfig(interaction.guildId, {
        channelId: selectedChannel.id,
      });

      await interaction.reply({
        content: `Canal de anuncios actualizado a <#${updated.channelId}>.`,
        ephemeral: true,
      });
      return;
    }

    if (action === "estado") {
      const embed = new EmbedBuilder()
        .setTitle("Anuncios de episodios")
        .setColor(settings?.enabled ? 0x22c55e : 0xef4444)
        .addFields(
          {
            name: "Estado",
            value: settings?.enabled ? "Activo" : "Inactivo",
            inline: true,
          },
          {
            name: "Canal",
            value: settings?.channelId
              ? `<#${settings.channelId}>`
              : "Sin configurar",
            inline: true,
          },
          {
            name: "Próximos disparos",
            value: formatNextRuns(),
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
