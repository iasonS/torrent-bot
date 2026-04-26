const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { execSync } = require("child_process");

const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Show bot status and debug information");

async function execute(interaction) {
  try {
    // Get git commit info
    let commitHash = "unknown";
    let commitMessage = "unknown";
    try {
      commitHash = execSync("git rev-parse --short HEAD").toString().trim();
      commitMessage = execSync("git log -1 --pretty=%B").toString().trim();
    } catch (err) {
      // Silently fail if git info unavailable
    }

    // Calculate uptime
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("🤖 Bot Status")
      .addFields(
        { name: "Status", value: "✅ Online", inline: true },
        { name: "Uptime", value: uptimeString, inline: true },
        { name: "Commit Hash", value: `\`${commitHash}\``, inline: false },
        { name: "Commit Message", value: `\`${commitMessage}\`` }
      )
      .setFooter({ text: "Latest deployment info" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Ping command error:", error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true,
    });
  }
}

module.exports = { data, execute };
