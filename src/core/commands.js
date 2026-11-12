const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");

const FEATURES_DIR = path.join(__dirname, "..", "features");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadCommands() {
  const commands = new Collection();

  for (const file of walk(FEATURES_DIR)) {
    const parts = file.split(path.sep);
    if (!parts.includes("commands")) continue;

    const command = require(file);
    if (!command || !command.data || typeof command.execute !== "function") {
      console.warn(
        `[commands] Ignorado ${path.relative(FEATURES_DIR, file)}: falta data o execute.`
      );
      continue;
    }

    commands.set(command.data.name, command);
    console.log(`[commands] Cargado /${command.data.name}`);
  }

  return commands;
}

async function handleInteraction(interaction, commands) {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[commands] Error en /${interaction.commandName}:`, error);

    const payload = {
      content: "Ocurrió un error al ejecutar el comando.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

module.exports = { loadCommands, handleInteraction };
