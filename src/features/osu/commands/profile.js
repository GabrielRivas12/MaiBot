const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { fetchUser } = require("../services/osu-api.service");
const { getLink, saveLink } = require("../services/osu-link.service");
const {
  formatNumber,
  formatAccuracy,
} = require("../services/osu-format.service");

const EMBED_COLOR = 0xf472b6;

function formatJoinDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", { dateStyle: "long" });
}

function formatPlayTime(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  return `${Math.round(seconds / 3600).toLocaleString("es-ES")} h`;
}

function buildEmbed(user, { footerText } = {}) {
  const stats = user.statistics || {};
  const level =
    typeof stats.level === "object" ? stats.level?.current : stats.level;
  const progress =
    typeof stats.level === "object" ? stats.level?.progress : null;

  const levelValue = Number.isFinite(level)
    ? `${level}${Number.isFinite(progress) ? ` (${progress}%)` : ""}`
    : "—";

  const country = user.country_code
    ? ` (${user.country_code.toUpperCase()})`
    : "";

  const embed = new EmbedBuilder()
    .setTitle(user.username)
    .setURL(`https://osu.ppy.sh/users/${user.id}/osu`)
    .setColor(EMBED_COLOR)
    .setDescription("Perfil de **osu!standard**")
    .addFields(
      {
        name: "Rank global",
        value: Number.isFinite(stats.global_rank)
          ? `#${formatNumber(stats.global_rank)}`
          : "—",
        inline: true,
      },
      {
        name: "Rank país",
        value: Number.isFinite(stats.country_rank)
          ? `#${formatNumber(stats.country_rank)}${country}`
          : "—",
        inline: true,
      },
      {
        name: "PP",
        value: Number.isFinite(stats.pp) ? `${formatNumber(stats.pp)} pp` : "—",
        inline: true,
      },
      {
        name: "Precisión",
        value: formatAccuracy(stats.accuracy),
        inline: true,
      },
      {
        name: "Play count",
        value: formatNumber(stats.play_count),
        inline: true,
      },
      { name: "Nivel", value: levelValue, inline: true },
      {
        name: "Score rankeado",
        value: formatNumber(stats.ranked_score),
        inline: true,
      },
      {
        name: "Hits totales",
        value: formatNumber(stats.total_hits),
        inline: true,
      },
      {
        name: "Tiempo jugado",
        value: formatPlayTime(stats.play_time),
        inline: true,
      },
      {
        name: "Se unió",
        value: formatJoinDate(user.join_date),
        inline: true,
      }
    )
    .setFooter({
      text: footerText || "osu!standard · Datos oficiales",
    })
    .setTimestamp();

  if (user.avatar_url) embed.setThumbnail(user.avatar_url);
  if (user.cover_url) embed.setImage(user.cover_url);

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Muestra un perfil de osu! o vincula tu cuenta.")
    .addStringOption((option) =>
      option
        .setName("accion")
        .setDescription("Qué hacer: ver un perfil o vincular tu cuenta.")
        .addChoices(
          { name: "Ver perfil", value: "ver" },
          { name: "Vincular cuenta", value: "vincular" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuario de osu! a consultar (no se guarda) o vincular.")
    ),

  async execute(interaction) {
    const action = interaction.options.getString("accion") || "ver";
    const explicit = interaction.options.getString("usuario");
    const link = await getLink(interaction.user.id);

    if (action === "vincular" && !explicit) {
      await interaction.reply({
        content:
          "Indica el usuario de osu! que quieres vincular: `/profile accion:Vincular cuenta usuario:<tu_usuario>`.",
        ephemeral: true,
      });
      return;
    }

    const target = explicit || link?.osuUserId || link?.osuUsername;

    if (!target) {
      await interaction.reply({
        content:
          "No tienes una cuenta de osu! vinculada. Usa `/profile accion:Vincular cuenta usuario:<tu_usuario>` para vincularla.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const user = await fetchUser(target, "osu");

      if (!user) {
        await interaction.editReply(
          `No encontré al usuario de osu! «${target}».`
        );
        return;
      }

      if (action === "vincular") {
        let saved = false;

        try {
          await saveLink(interaction.user.id, {
            osuUserId: user.id,
            osuUsername: user.username,
          });
          saved = true;
        } catch (error) {
          console.error("[osu] No pude guardar el enlace de /profile:", error);
        }

        const payload = {
          embeds: [
            buildEmbed(user, {
              footerText: saved
                ? "osu!standard · Enlace guardado para tus próximos comandos"
                : "osu!standard · No se pudo guardar el enlace",
            }),
          ],
        };

        if (!saved) {
          payload.content =
            "Mostré el perfil, pero no pude guardar el enlace. Inténtalo de nuevo.";
        }

        await interaction.editReply(payload);
        return;
      }

      const viewingOwnLink = !explicit && Boolean(link);

      await interaction.editReply({
        embeds: [
          buildEmbed(user, {
            footerText: viewingOwnLink
              ? "osu!standard · Cuenta vinculada a tu Discord"
              : "osu!standard · Datos oficiales (no se guardó)",
          }),
        ],
      });
    } catch (error) {
      console.error("[osu] Error en /profile:", error);
      await interaction.editReply(
        `No pude obtener el perfil: ${error.message}`
      );
    }
  },
};
