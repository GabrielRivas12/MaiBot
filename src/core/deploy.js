const { REST, Routes, Events, Client, GatewayIntentBits } = require("discord.js");
const config = require("../config");

async function deployCommands(client) {
  if (!config.guildId) {
    console.warn(
      "[deploy] GUILD_ID no configurado; los comandos slash no se registrarán."
    );
    return;
  }

  const body = [...client.commands.values()].map((command) =>
    command.data.toJSON()
  );

  const rest = new REST().setToken(config.token);

  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.guildId),
      { body }
    );

    console.log(
      `[deploy] ${data.length} comandos registrados en el guild ${config.guildId}.`
    );
  } catch (error) {
    console.error("[deploy] Error registrando comandos:", error);
  }
}

if (require.main === module) {
  const { loadCommands } = require("./commands");

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.commands = loadCommands();

  client.once(Events.ClientReady, async () => {
    await deployCommands(client);
    client.destroy();
  });

  client.login(config.token).catch((error) => {
    console.error("[deploy] No se pudo iniciar sesión:", error);
    process.exitCode = 1;
  });
}

module.exports = { deployCommands };
