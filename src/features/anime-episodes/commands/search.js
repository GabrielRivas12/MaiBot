const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  searchAnime,
  fetchAnimeInfo,
} = require("../services/anime-api.service");
const { imageUrl, itadakimasuUrl } = require("../services/announce.service");

const RESULT_COLOR = 0x60a5fa;
const INFO_COLOR = 0x22c55e;
const COLLECTOR_MS = 5 * 60 * 1000;
const MAX_SYNOPSIS = 3500;

function truncate(text, max) {
  if (!text) return "Sin sinopsis disponible.";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildResultEmbed(results, index, query) {
  const result = results[index];
  const url = itadakimasuUrl(result);

  const embed = new EmbedBuilder()
    .setTitle(result.title)
    .setURL(url)
    .setColor(RESULT_COLOR)
    .setDescription(`[Ver en Itadakimasu](${url})`)
    .addFields(
      { name: "Tipo", value: result.type || "—", inline: true },
      { name: "Proveedor", value: result.provider || "AnimeAV1", inline: true }
    )
    .setFooter({
      text: `Resultado ${index + 1} de ${results.length} · Búsqueda: ${query}`,
    });

  const cover = imageUrl(result);
  if (cover) embed.setThumbnail(cover);

  return embed;
}

function buildInfoEmbed(info, result) {
  const genres =
    (info.genres || []).map((genre) => genre.name).join(", ") || "—";
  const url = itadakimasuUrl(result);

  const embed = new EmbedBuilder()
    .setTitle(info.title || "Sin título")
    .setURL(url)
    .setColor(INFO_COLOR)
    .setDescription(
      `[Ver en Itadakimasu](${url})\n\n${truncate(
        info.description,
        MAX_SYNOPSIS
      )}`
    )
    .addFields(
      {
        name: "Calificación",
        value: info.score != null ? String(info.score) : "—",
        inline: true,
      },
      {
        name: "Episodios",
        value: info.totalEpisodes != null ? String(info.totalEpisodes) : "—",
        inline: true,
      },
      { name: "Estado", value: info.status || "—", inline: true },
      { name: "Tipo", value: info.type || "—", inline: true },
      { name: "Géneros", value: genres, inline: false }
    );

  const cover = imageUrl(info);
  if (cover) embed.setThumbnail(cover);

  if (info.year) embed.setFooter({ text: `Año: ${info.year}` });

  return embed;
}

function buildButtons(results, index, view) {
  if (view === "info") {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("search:back")
        .setLabel("Volver")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("search:prev")
      .setLabel("Anterior")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId("search:next")
      .setLabel("Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index >= results.length - 1),
    new ButtonBuilder()
      .setCustomId("search:info")
      .setLabel("Ver info")
      .setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Busca un anime por nombre y muestra sus datos.")
    .addStringOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre del anime a buscar.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("pagina")
        .setDescription("Resultado inicial del carrusel.")
        .setMinValue(1)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("nombre");
    const page = interaction.options.getInteger("pagina") || 1;

    await interaction.deferReply();

    try {
      const results = await searchAnime(query);

      if (!results.length) {
        await interaction.editReply(`No encontré resultados para «${query}».`);
        return;
      }

      let index = Math.min(Math.max(page - 1, 0), results.length - 1);
      let view = "results";
      let info = null;

      const render = () =>
        view === "info"
          ? {
              embeds: [buildInfoEmbed(info, results[index])],
              components: [buildButtons(results, index, "info")],
            }
          : {
              embeds: [buildResultEmbed(results, index, query)],
              components: [buildButtons(results, index, "results")],
            };

      const message = await interaction.editReply(render());
      const collector = message.createMessageComponentCollector({
        time: COLLECTOR_MS,
      });

      collector.on("collect", async (button) => {
        if (button.user.id !== interaction.user.id) {
          await button
            .reply({
              content: "Este buscador no es tuyo. Usa `/search`.",
              ephemeral: true,
            })
            .catch(() => {});
          return;
        }

        try {
          if (button.customId === "search:info") {
            await button.deferUpdate();
            const detail = await fetchAnimeInfo(
              results[index].url || results[index].slug
            );

            if (!detail) {
              await button.followUp({
                content: "No pude cargar la información de ese anime.",
                ephemeral: true,
              });
              return;
            }

            info = detail;
            view = "info";
            await button.editReply(render());
            return;
          }

          if (button.customId === "search:prev") {
            index = Math.max(index - 1, 0);
          } else if (button.customId === "search:next") {
            index = Math.min(index + 1, results.length - 1);
          } else if (button.customId === "search:back") {
            view = "results";
          }

          await button.update(render());
        } catch (error) {
          console.error("[search] Error en botón:", error);

          if (!button.replied && !button.deferred) {
            await button
              .reply({
                content: "Ocurrió un error al actualizar el resultado.",
                ephemeral: true,
              })
              .catch(() => {});
          }
        }
      });

      collector.on("end", () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (error) {
      console.error("[search] Error:", error);
      await interaction.editReply(
        `No pude completar la búsqueda: ${error.message}`
      );
    }
  },
};
