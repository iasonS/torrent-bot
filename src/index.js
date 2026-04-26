const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const searchCommand = require("./commands/search");
const movieCommand = require("./commands/movie");
const cancelCommand = require("./commands/cancel");
const asciiCommand = require("./commands/ascii");

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!DISCORD_BOT_TOKEN) { console.error("DISCORD_BOT_TOKEN is required"); process.exit(1); }
if (!process.env.PROWLARR_API_KEY) { console.error("PROWLARR_API_KEY is required"); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY is required"); process.exit(1); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST().setToken(DISCORD_BOT_TOKEN);
  try {
    const commands = [searchCommand.data.toJSON(), movieCommand.data.toJSON(), cancelCommand.data.toJSON(), asciiCommand.data.toJSON()];
    if (DISCORD_CHANNEL_ID) {
      const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
      if (channel?.guild) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, channel.guild.id), { body: commands });
        console.log(`Registered slash commands in guild: ${channel.guild.name}`);
      }
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log("Registered global slash commands");
    }
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "clear_messages") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter((m) => m.author.id === client.user.id);
      await Promise.all(botMessages.map((m) => m.delete().catch(() => {})));
      await interaction.editReply({ content: `Cleared ${botMessages.size} messages.` });
    } catch (err) {
      console.error("Clear error:", err);
      await interaction.editReply({ content: "Failed to clear messages." });
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (DISCORD_CHANNEL_ID && interaction.channelId !== DISCORD_CHANNEL_ID) {
    await interaction.reply({ content: "This command is not available in this channel.", ephemeral: true });
    return;
  }

  if (interaction.commandName === "search") await searchCommand.execute(interaction);
  if (interaction.commandName === "movie") await movieCommand.execute(interaction);
  if (interaction.commandName === "cancel") await cancelCommand.execute(interaction);
  if (interaction.commandName === "ascii") await asciiCommand.execute(interaction);
});

client.login(DISCORD_BOT_TOKEN);
