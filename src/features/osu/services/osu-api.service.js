const config = require("../../../config");

const TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const API_URL = "https://osu.ppy.sh/api/v2";

const USER_CACHE_TTL = 10 * 60 * 1000;

let accessToken = null;
let tokenExpiresAt = 0;

const userIdCache = new Map();

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
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`No pude obtener el token de osu! (${response.status}).`);
  }

  const data = await response.json();

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return accessToken;
}

async function apiRequest(pathname, params) {
  const token = await getAccessToken();
  const query = params ? `?${new URLSearchParams(params)}` : "";

  const response = await fetch(`${API_URL}${pathname}${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`osu! respondió ${response.status} en ${pathname}.`);
  }

  return response.json();
}

async function searchBeatmapsets(query) {
  const data = await apiRequest("/beatmapsets/search", { q: query, m: "0" });

  return {
    beatmapsets: data?.beatmapsets || [],
    total: data?.total || 0,
  };
}

async function fetchUser(user, mode = "osu") {
  if (!user) return null;
  return apiRequest(`/users/${encodeURIComponent(user)}/${mode}`);
}

async function resolveUserId(user, mode = "osu") {
  if (!user) return null;

  if (typeof user === "number" || /^\d+$/.test(String(user))) {
    return Number(user);
  }

  const cacheKey = `${mode}:${String(user).toLowerCase()}`;
  const cached = userIdCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) return cached.id;

  const data = await fetchUser(user, mode);
  if (!data?.id) return null;

  userIdCache.set(cacheKey, {
    id: data.id,
    expiresAt: Date.now() + USER_CACHE_TTL,
  });

  return data.id;
}

async function fetchBestScores(user, mode = "osu", limit = 5) {
  if (!user) return [];

  const userId = await resolveUserId(user, mode);
  if (!userId) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 100);
  const data = await apiRequest(`/users/${userId}/scores/best`, {
    mode,
    limit: safeLimit,
  });

  return data || [];
}

async function fetchRecentScores(user, mode = "osu", limit = 5, includeFails = true) {
  if (!user) return [];

  const userId = await resolveUserId(user, mode);
  if (!userId) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 100);
  const data = await apiRequest(`/users/${userId}/scores/recent`, {
    mode,
    limit: safeLimit,
    include_fails: includeFails ? 1 : 0,
  });

  return data || [];
}

module.exports = {
  fetchBestScores,
  fetchRecentScores,
  fetchUser,
  getAccessToken,
  hasCredentials,
  resolveUserId,
  searchBeatmapsets,
};
