const { Events, AttachmentBuilder } = require("discord.js");

const CUSTOM_EMOJI_REGEX = /^<a?:(\w+):(\d+)>$/;

module.exports = {
  name: Events.MessageCreate,
  once: false,

  async execute(message) {
    if (message.author.bot) return;
    if (message.attachments.size) return;

    const content = message.content.trim();
    const match = content.match(CUSTOM_EMOJI_REGEX);
    if (!match) return;

    const [, emojiName, emojiId] = match;
    const extension = content.startsWith("<a:") ? "gif" : "png";
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

    try {
      const response = await fetch(emojiUrl, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`No pude descargar el emoji (${response.status}).`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const attachment = new AttachmentBuilder(buffer, {
        name: `${emojiName}.${extension}`,
      });

      await message.delete().catch(() => {});
      await message.channel.send({ files: [attachment] });
    } catch (error) {
      console.error("[emoji] Error al enviar emoji como imagen:", error);
    }
  },
};
