const { EmbedBuilder } = require("discord.js");
const config = require("../../../config");
const { fetchTodayEpisodes } = require("./anime-api.service");
const {
  getEnabledGuilds,
  getGuildConfig,
  getSentKeys,
  markSent,
} = require("./state.service");

const MAX_EMBEDS = 10;
const EMBED_COLOR = 0x60a5fa;

let running = null;

function episodeKey(episode) {
  return `${episode.slug}:${episode.episode}`;
}

function chunk(list, size) {
  const chunks = [];

  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }

  return chunks;
}

function itadakimasuUrl(episode) {
  const base = config.itadakimasuBaseUrl.replace(/\/$/, "");
  const params = [
    `url=${encodeURIComponent(episode.slug)}`,
    `title=${encodeURIComponent(episode.title)}`,
  ];

  if (episode.episode != null && episode.episode !== "") {
    params.push(`episode=${encodeURIComponent(episode.episode)}`);
  }

  return `${base}/animatedetailsepaicore?${params.join("&")}`;
}

function imageUrl(episode) {
  if (!episode.image) return null;
  if (!config.animeApiUrl) return episode.image;

  const base = config.animeApiUrl.replace(/\/$/, "");
  return `${base}/api/v1/anime/image-proxy?url=${encodeURIComponent(
    episode.image
  )}`;
}

function buildEmbed(episode) {
  const embed = new EmbedBuilder()
    .setTitle(episode.title)
    .setURL(itadakimasuUrl(episode))
    .setColor(EMBED_COLOR)
    .addFields(
      { name: "Episodio", value: String(episode.episode), inline: true },
      { name: "Categoría", value: episode.category || "Anime", inline: true },
      { name: "Proveedor", value: episode.provider || "AnimeAV1", inline: true }
    )
    .setFooter({ text: "Nuevo episodio · AnimeAV1" })
    .setTimestamp();

  const cover = imageUrl(episode);
  if (cover) embed.setImage(cover);

  return embed;
}

function formatPreview(episodes) {
  if (!episodes.length) return "No hay episodios nuevos de hoy.";

  const lines = episodes
    .slice(0, 20)
    .map(
      (episode) =>
        `• **${episode.title}** — Ep. ${episode.episode} · ${episode.category}`
    );

  if (episodes.length > 20) {
    lines.push(`… y ${episodes.length - 20} más.`);
  }

  return lines.join("\n");
}

async function withLock(task) {
  if (running) {
    throw new Error("Ya hay un envío de episodios en curso.");
  }

  running = Promise.resolve()
    .then(task)
    .finally(() => {
      running = null;
    });

  return running;
}

async function sendToChannel(client, guildId, channelId, pending, todayKey) {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    console.warn(`[anime] Canal ${channelId} no válido para guild ${guildId}.`);
    return 0;
  }

  let sent = 0;

  for (const batch of chunk(pending, MAX_EMBEDS)) {
    await channel.send({ embeds: batch.map(buildEmbed) });
    await markSent(guildId, todayKey, batch.map(episodeKey));
    sent += batch.length;
  }

  return sent;
}

async function runScheduled(client) {
  return withLock(async () => {
    const targets = await getEnabledGuilds();

    if (!targets.length) {
      console.log("[anime] Sin servidores con anuncios activos.");
      return { sent: 0 };
    }

    const { todayKey, episodes } = await fetchTodayEpisodes();

    if (!episodes.length) {
      console.log("[anime] No hay episodios de hoy.");
      return { sent: 0 };
    }

    let sent = 0;

    for (const target of targets) {
      try {
        const sentKeys = await getSentKeys(target.guildId, todayKey);
        const pending = episodes.filter(
          (episode) => !sentKeys.has(episodeKey(episode))
        );

        if (!pending.length) continue;

        sent += await sendToChannel(
          client,
          target.guildId,
          target.channelId,
          pending,
          todayKey
        );
      } catch (error) {
        console.error(
          `[anime] Error enviando a guild ${target.guildId}:`,
          error
        );
      }
    }

    return { sent };
  });
}

async function runManual(client, guildId, { force = false, dryRun = false } = {}) {
  return withLock(async () => {
    const { todayKey, episodes } = await fetchTodayEpisodes();
    const sentKeys = force ? new Set() : await getSentKeys(guildId, todayKey);
    const pending = episodes.filter(
      (episode) => !sentKeys.has(episodeKey(episode))
    );

    if (dryRun || !pending.length) {
      return { sent: 0, pending };
    }

    const settings = await getGuildConfig(guildId);

    if (!settings?.enabled || !settings.channelId) {
      throw new Error("Los anuncios no están activos en este servidor.");
    }

    const sent = await sendToChannel(
      client,
      guildId,
      settings.channelId,
      pending,
      todayKey
    );

    return { sent, pending };
  });
}

module.exports = {
  buildEmbed,
  formatPreview,
  imageUrl,
  itadakimasuUrl,
  runManual,
  runScheduled,
};
