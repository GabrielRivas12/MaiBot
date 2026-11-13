require("dotenv").config();

const config = {
  token: process.env.DISCORD_TOKEN || process.env.TOKEN_URL || null,
  guildId: process.env.GUILD_ID || null,
  osuReplayChannelId: process.env.OSU_REPLAY_CHANNEL_ID || null,
  osuClientId: process.env.OSU_CLIENT_ID || null,
  osuClientSecret: process.env.OSU_CLIENT_SECRET || null,
  animeApiUrl: process.env.URL_BASE || null,
  animeApiKey: process.env.API_KEY || null,
  animeTimezone: process.env.ANIME_TIMEZONE || "America/Managua",
  animeSchedule: process.env.ANIME_SCHEDULE || "0 9,14 * * *",
  itadakimasuBaseUrl:
    process.env.ITADAKIMASU_BASE_URL || "https://itadakimasu.online",
};

if (!config.token) {
  throw new Error(
    "Falta DISCORD_TOKEN en el .env. Copia .env.example y completa los valores."
  );
}

module.exports = config;
