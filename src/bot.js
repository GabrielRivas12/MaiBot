const { Client, GatewayIntentBits, Events } = require("discord.js");
const config = require("./config");
const { loadCommands, handleInteraction } = require("./core/commands");
const { loadEvents } = require("./core/events");

function start() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = loadCommands();

  client.on(Events.InteractionCreate, (interaction) =>
    handleInteraction(interaction, client.commands)
  );

  loadEvents(client);

  client.login(config.token).catch((error) => {
    console.error("[bot] No se pudo iniciar sesión:", error);
    process.exitCode = 1;
  });
}

module.exports = { start };
