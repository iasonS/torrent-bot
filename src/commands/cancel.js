const { SlashCommandBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("cancel")
  .setDescription("Cancel any stuck search and restart the bot");

async function execute(interaction) {
  await interaction.reply({ content: "🔄 Restarting bot — any stuck search will be cancelled." });
  setTimeout(() => process.exit(0), 1000); // give Discord time to send the reply
}

module.exports = { data, execute };
