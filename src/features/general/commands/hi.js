const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hi")
    .setDescription("Saluda con un Hello World!"),

  async execute(interaction) {
    await interaction.reply("Hello World!");
  },
};
