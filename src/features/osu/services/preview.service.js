const { AttachmentBuilder } = require("discord.js");

function sanitizeFileName(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `https:${url}`;
}

async function buildPreview(beatmapset) {
  const url = normalizeUrl(beatmapset.preview_url);
  if (!url) return null;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const base =
      sanitizeFileName(`${beatmapset.artist} - ${beatmapset.title}`) ||
      `beatmap-${beatmapset.id}`;

    return new AttachmentBuilder(buffer, { name: `${base}.mp3` });
  } catch (error) {
    console.warn("[osu] No pude descargar el preview:", error.message);
    return null;
  }
}

module.exports = { buildPreview };
