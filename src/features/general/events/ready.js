const { Events, ActivityType } = require("discord.js");
const { deployCommands } = require("../../../core/deploy");

const PRESENCE_DETAILS = [
  "Cuidando tus episodios favoritos",
  "Siempre atenta a los nuevos episodios de anime",
  "Espiando Itadakimasu por ti",
  "Lista para ayudarte cuando me necesites",
];
const PRESENCE_INTERVAL_MS = 60_000;

function setMaiPresence(client, index = 0) {
  client.user.setPresence({
    status: "online",
    afk: false,
    activities: [
      {
        name: "Waifu asistente",
        type: ActivityType.Playing,
        state: `${PRESENCE_DETAILS[index % PRESENCE_DETAILS.length]} • ${
          client.guilds.cache.size
        } servidores`,
      },
    ],
  });
}

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`Hello world! soy MaiBot ${client.user.tag}`);

    setMaiPresence(client);

    let index = 1;
    setInterval(
      () => setMaiPresence(client, index++),
      PRESENCE_INTERVAL_MS
    ).unref();

    await deployCommands(client);
  },
};
