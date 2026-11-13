const cron = require("node-cron");
const config = require("../../../config");
const { runScheduled } = require("./announce.service");
const { localTime } = require("./time.service");

let task = null;

function upcomingRuns(count = 2) {
  if (!task) return [];
  return task.getNextRuns(count);
}

function startScheduler(client) {
  if (task) return task;

  if (!config.animeApiUrl) {
    console.warn(
      "[anime] URL_BASE no configurada; anuncios automáticos desactivados."
    );
    return null;
  }

  task = cron.schedule(
    config.animeSchedule,
    async () => {
      try {
        const result = await runScheduled(client);
        console.log(
          `[anime] Disparo ${localTime()}: ${result.sent} embeds enviados.`
        );
      } catch (error) {
        console.error("[anime] Error en disparo automático:", error);
      }
    },
    {
      timezone: config.animeTimezone,
      noOverlap: true,
      name: "anime-episodes",
    }
  );

  const next = upcomingRuns(2).map((date) => localTime(date)).join(", ");
  console.log(
    `[anime] Scheduler activo (${config.animeTimezone}). Próximos: ${next}`
  );

  return task;
}

module.exports = { startScheduler, upcomingRuns };
