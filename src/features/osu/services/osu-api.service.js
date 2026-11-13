const config = require("../../../config");

const TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const SEARCH_URL = "https://osu.ppy.sh/api/v2/beatmapsets/search";

let accessToken = null;
let tokenExpiresAt = 0;

function hasCredentials() {
  return Boolean(config.osuClientId && config.osuClientSecret);
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  if (!hasCredentials()) {
    throw new Error(
      "OSU_CLIENT_ID y OSU_CLIENT_SECRET no están configurados en el .env."
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.osuClientId,
      client_secret: config.osuClientSecret,
      grant_type: "client_credentials",
      scope: "public",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`No pude obtener el token de osu! (${response.status}).`);
  }

  const data = await response.json();

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return accessToken;
}

async function searchBeatmapsets(query) {
  const token = await getAccessToken();
  const params = new URLSearchParams({ q: query, m: "0" });

  const response = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`osu! respondió ${response.status} al buscar beatmaps.`);
  }

  const data = await response.json();

  return {
    beatmapsets: data.beatmapsets || [],
    total: data.total || 0,
  };
}

module.exports = {
  getAccessToken,
  hasCredentials,
  searchBeatmapsets,
};
