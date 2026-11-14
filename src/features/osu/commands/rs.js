const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../../config");
const {
  fetchRecentScores,
  fetchUser,
  resolveUserId,
} = require("../services/osu-api.service");
const { getLink } = require("../services/osu-link.service");
const {
  beatmapLabel,
  beatmapUrl,
  formatAccuracy,
  formatDateTime,
  formatMods,
  formatPp,
  formatRank,
} = require("../services/osu-format.service");

const EMBED_COLOR = 0xf472b6;

function buildScoreLine(score, index) {
  const stars = Number(score.beatmap?.difficulty_rating || 0).toFixed(2);
  const map = beatmapUrl(score)
    ? `[${beatmapLabel(score)}](${beatmapUrl(score)})`
    : beatmapLabel(score);
  const status = score.passed === false ? "❌" : "";

  return (
    `**${index + 1}.** **${formatPp(score.pp)}** · ${status}${formatRank(score.rank)}` +
    ` · ${formatAccuracy(score.accuracy)} · ${score.max_combo}x · ${formatMods(score.mods)}\n` +
    `${map} · ⭐ ${stars} · ${formatDateTime(score.created_at, config.animeTimezone)}`
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rs")
    .setDescription("Muestra los scores recientes de un usuario de osu!.")
    .addStringOption((option) =>
      option
        .setName("usuario")
        .setDescription(
          "Usuario de osu! (si no lo pones, se usa tu cuenta vinculada)."
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de scores a mostrar (1-5).")
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    const explicit = interaction.options.getString("usuario");
    const cantidad = interaction.options.getInteger("cantidad") || 1;
    const link = explicit ? null : await getLink(interaction.user.id);
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
      const userId = await resolveUserId(target, "osu");

      if (!userId) {
        await interaction.editReply(
          `No encontré al usuario de osu! «${target}».`
        );
        return;
      }

      const [user, scores] = await Promise.all([
        fetchUser(userId, "osu"),
        fetchRecentScores(userId, "osu", cantidad, true),
      ]);

      if (!user) {
        await interaction.editReply(
          `No encontré al usuario de osu! «${target}».`
        );
        return;
      }

      if (!scores.length) {
        await interaction.editReply(
          `${user.username} no tiene scores recientes en osu!standard.`
        );
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Últimos scores de ${user.username}`)
        .setURL(`https://osu.ppy.sh/users/${user.id}/osu`)
        .setColor(EMBED_COLOR)
        .setDescription(scores.map(buildScoreLine).join("\n\n"))
        .setFooter({
          text: `osu!standard · ${scores.length} score(s) · Datos oficiales`,
        })
        .setTimestamp();

      if (user.avatar_url) embed.setThumbnail(user.avatar_url);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("[osu] Error en /rs:", error);
      await interaction.editReply(
        `No pude obtener los scores recientes: ${error.message}`
      );
    }
  },
};
