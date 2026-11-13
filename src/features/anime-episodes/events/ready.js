const { Events } = require("discord.js");
const { startScheduler } = require("../services/scheduler.service");

module.exports = {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    startScheduler(client);
  },
};
