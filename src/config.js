require("dotenv").config();

const config = {
  token: process.env.DISCORD_TOKEN || process.env.TOKEN_URL || null,
  guildId: process.env.GUILD_ID || null,
  osuReplayChannelId: process.env.OSU_REPLAY_CHANNEL_ID || null,
  animeCalendarUrl: process.env.ANIME_CALENDAR_URL || null,
};

if (!config.token) {
  throw new Error(
    "Falta DISCORD_TOKEN en el .env. Copia .env.example y completa los valores."
  );
}

module.exports = config;
