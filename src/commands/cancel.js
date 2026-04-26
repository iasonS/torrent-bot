const { SlashCommandBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("cancel")
  .setDescription("Cancel any stuck search and restart the bot");

async function execute(interaction) {
  console.log("Cancel command executed!");
  await interaction.reply({ content: "🔄 Restarting bot — any stuck search will be cancelled." });
  console.log("Cancel command reply sent, exiting in 1s...");
  setTimeout(() => {
    console.log("Exiting process...");
    process.exit(0);
  }, 1000);
}

module.exports = { data, execute };
