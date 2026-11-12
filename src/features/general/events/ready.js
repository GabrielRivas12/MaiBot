const { Events, ActivityType } = require("discord.js");
const { deployCommands } = require("../../../core/deploy");

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`Hello world! soy MaiBot ${client.user.tag}`);

    client.user.setActivity("Waifu asistente", { type: ActivityType.Watching });

    await deployCommands(client);
  },
};
