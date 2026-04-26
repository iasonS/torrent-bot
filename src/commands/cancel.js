const { SlashCommandBuilder } = require("discord.js");
const { exec } = require("child_process");

const data = new SlashCommandBuilder()
  .setName("cancel")
  .setDescription("Cancel any stuck search and restart the bot");

async function execute(interaction) {
  await interaction.reply({ content: "🔄 Restarting bot — any stuck search will be cancelled." });

  // Restart the Docker container
  setTimeout(() => {
    exec("docker restart torrent-bot", (err) => {
      if (err) console.error("Failed to restart container:", err);
    });
  }, 500);
}

module.exports = { data, execute };
