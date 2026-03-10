const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const searchCommand = require("./commands/search");

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!DISCORD_BOT_TOKEN) {
  console.error("DISCORD_BOT_TOKEN is required");
  process.exit(1);
}
if (!process.env.PROWLARR_API_KEY) {
  console.error("PROWLARR_API_KEY is required");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is required");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register slash commands on startup
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST().setToken(DISCORD_BOT_TOKEN);

  try {
    // Register commands globally (takes up to 1h to propagate)
    // For instant testing, use guild-specific registration
    const commands = [searchCommand.data.toJSON()];

    if (DISCORD_CHANNEL_ID) {
      // Try to get guild from channel for guild-specific registration
      const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
      if (channel?.guild) {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, channel.guild.id),
          { body: commands }
        );
        console.log(`Registered slash commands in guild: ${channel.guild.name}`);
      }
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands,
      });
      console.log("Registered global slash commands");
    }
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

// Handle slash command interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Optionally restrict to specific channel
  if (DISCORD_CHANNEL_ID && interaction.channelId !== DISCORD_CHANNEL_ID) {
    await interaction.reply({
      content: "This command is not available in this channel.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName === "search") {
    await searchCommand.execute(interaction);
  }
});

client.login(DISCORD_BOT_TOKEN);
